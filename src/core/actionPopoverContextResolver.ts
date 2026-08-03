import { AssignedActionCache } from "@/storage/firebase/assignedActionCache";
import { ActionPopoverContextCache } from "@/storage/firebase/actionPopoverContextCache";
import type {
  MembershipRepository,
  ProfileActionRepository,
} from "@/storage/firebase/repositories";
import type { FirestoreAction } from "@/types/firebase";

export type ActionPopoverContextSource = "ASSIGNED_CACHE" | "TARGETED_CACHE" | "FIRESTORE";

export interface ResolvedActionPopoverContext {
  profileId: string;
  variables: Record<string, number>;
  action: FirestoreAction;
  source: ActionPopoverContextSource;
}

export interface ActionPopoverContextResolverOptions {
  membershipRepository: MembershipRepository;
  profileRepository: ProfileActionRepository;
  assignedCache?: AssignedActionCache;
  targetedCache?: ActionPopoverContextCache;
}

export class ActionPopoverContextResolver {
  private readonly assignedCache: AssignedActionCache;
  private readonly targetedCache: ActionPopoverContextCache;

  constructor(private readonly options: ActionPopoverContextResolverOptions) {
    this.assignedCache = options.assignedCache ?? new AssignedActionCache();
    this.targetedCache = options.targetedCache ?? new ActionPopoverContextCache();
  }

  async resolve(
    roomId: string,
    uid: string,
    actionId: string
  ): Promise<ResolvedActionPopoverContext> {
    if (!roomId || !uid || !actionId) throw new Error("Contexto da ação incompleto.");

    const assigned = this.assignedCache.load(roomId, uid);
    const assignedAction = assigned?.actions.find((candidate) => candidate.id === actionId);
    if (assigned && assignedAction) {
      return {
        profileId: assigned.profile.id,
        variables: assigned.profile.variables,
        action: assignedAction,
        source: "ASSIGNED_CACHE",
      };
    }

    const targeted = this.targetedCache.load(roomId, uid, actionId);
    if (targeted) {
      return {
        profileId: targeted.profileId,
        variables: targeted.variables,
        action: targeted.action,
        source: "TARGETED_CACHE",
      };
    }

    const member = await this.options.membershipRepository.getMember(roomId, uid);
    if (!member) {
      this.clear(roomId, uid);
      throw new Error("Nenhum perfil foi associado a este jogador.");
    }
    const profile = await this.options.profileRepository.getProfile(roomId, member.profileId);
    if (!profile) {
      this.clear(roomId, uid);
      throw new Error("O perfil associado não está mais disponível.");
    }
    const action = await this.options.profileRepository.getAction(
      roomId,
      profile.id,
      actionId
    );
    if (!action) {
      this.targetedCache.clearAction(roomId, uid, actionId);
      throw new Error("A ação selecionada não está mais disponível.");
    }

    this.targetedCache.save(roomId, uid, {
      actionId,
      profileId: profile.id,
      variables: profile.variables,
      action,
    });
    return {
      profileId: profile.id,
      variables: profile.variables,
      action,
      source: "FIRESTORE",
    };
  }

  clear(roomId: string, uid: string): void {
    this.assignedCache.clear(roomId, uid);
    this.targetedCache.clearAll(roomId, uid);
  }
}
