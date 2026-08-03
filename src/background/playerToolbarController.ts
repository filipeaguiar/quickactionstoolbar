import type { FirebaseSession } from "@/integrations/firebase/authSession";
import type { FirestoreAction, FirestoreProfile, RoomMember } from "@/types/firebase";
import { AssignedActionCache } from "@/storage/firebase/assignedActionCache";
import { ActionPopoverContextCache } from "@/storage/firebase/actionPopoverContextCache";
import {
  RepositoryError,
  type MembershipRepository,
  type ProfileActionRepository,
  type RepositoryUnsubscribe,
  type WorkspaceRepository,
} from "@/storage/firebase/repositories";

export type PlayerToolbarState =
  | "LOADING"
  | "WORKSPACE_NOT_INITIALIZED"
  | "AWAITING_APPROVAL"
  | "ASSIGNED"
  | "OFFLINE_CACHE"
  | "AUTHORIZATION_DENIED"
  | "BACKEND_ERROR";

export interface ToolbarPlayerIdentity {
  owlbearPlayerId: string;
  playerName: string;
}

export interface AssignedToolbarContext {
  uid: string;
  profile: FirestoreProfile;
}

export interface PlayerToolbarControllerOptions {
  workspaceRepository: WorkspaceRepository;
  profileRepository: ProfileActionRepository;
  membershipRepository: MembershipRepository;
  cache?: AssignedActionCache;
  targetedCache?: ActionPopoverContextCache;
  syncActions(
    actions: FirestoreAction[],
    context?: AssignedToolbarContext
  ): Promise<void>;
  onState?(state: PlayerToolbarState, message?: string): void;
}

export class PlayerToolbarController {
  private readonly cache: AssignedActionCache;
  private readonly targetedCache: ActionPopoverContextCache;
  private roomId = "";
  private session: FirebaseSession | null = null;
  private memberUnsubscribe: RepositoryUnsubscribe | null = null;
  private profileUnsubscribe: RepositoryUnsubscribe | null = null;
  private actionsUnsubscribe: RepositoryUnsubscribe | null = null;
  private currentProfile: FirestoreProfile | null = null;
  private currentActions: FirestoreAction[] = [];

  constructor(private readonly options: PlayerToolbarControllerOptions) {
    this.cache = options.cache ?? new AssignedActionCache();
    this.targetedCache = options.targetedCache ?? new ActionPopoverContextCache();
  }

  async start(
    roomId: string,
    session: FirebaseSession,
    player: ToolbarPlayerIdentity
  ): Promise<void> {
    this.stopSubscriptions();
    this.roomId = roomId;
    this.session = session;
    this.emit("LOADING");

    const cached = this.cache.load(roomId, session.uid);
    if (cached) {
      this.currentProfile = cached.profile;
      this.currentActions = cached.actions;
      await this.options.syncActions(cached.actions, {
        uid: session.uid,
        profile: cached.profile,
      });
      this.emit("OFFLINE_CACHE", "Ações carregadas do cache enquanto o Firebase sincroniza.");
    }

    try {
      const workspace = await this.options.workspaceRepository.get(roomId);
      if (!workspace) {
        await this.clearAssignment("WORKSPACE_NOT_INITIALIZED");
        return;
      }

      const member = await this.options.membershipRepository.getMember(roomId, session.uid);
      if (!member) {
        if (workspace.ownerUid !== session.uid) {
          await this.options.membershipRepository.submitJoinRequest(roomId, {
            uid: session.uid,
            owlbearPlayerId: player.owlbearPlayerId,
            playerName: player.playerName,
          });
        }
        await this.clearAssignment("AWAITING_APPROVAL");
      } else {
        await this.subscribeAssignment(member);
      }

      this.memberUnsubscribe = this.options.membershipRepository.subscribeMember(
        roomId,
        session.uid,
        (nextMember) => {
          if (!nextMember) {
            void this.clearAssignment("AWAITING_APPROVAL");
          } else {
            void this.subscribeAssignment(nextMember);
          }
        },
        (error) => void this.handleError(error)
      );
    } catch (error) {
      await this.handleError(error);
    }
  }

  async stop(): Promise<void> {
    this.stopSubscriptions();
    this.session = null;
    this.currentProfile = null;
    this.currentActions = [];
    await this.options.syncActions([]);
  }

  private async subscribeAssignment(member: RoomMember): Promise<void> {
    this.stopProfileSubscriptions();
    const session = this.session;
    if (!session) return;

    const profile = await this.options.profileRepository.getProfile(this.roomId, member.profileId);
    if (!profile) {
      await this.clearAssignment("AWAITING_APPROVAL");
      return;
    }
    this.targetedCache.clearAll(this.roomId, session.uid);
    this.currentProfile = profile;
    this.currentActions = await this.options.profileRepository.listActions(
      this.roomId,
      member.profileId
    );
    await this.publishAssigned();

    this.profileUnsubscribe = this.options.profileRepository.subscribeProfile(
      this.roomId,
      member.profileId,
      (nextProfile) => {
        if (!nextProfile) {
          void this.clearAssignment("AUTHORIZATION_DENIED");
          return;
        }
        this.targetedCache.clearAll(this.roomId, session.uid);
        this.currentProfile = nextProfile;
        void this.publishAssigned();
      },
      (error) => void this.handleError(error)
    );
    this.actionsUnsubscribe = this.options.profileRepository.subscribeActions(
      this.roomId,
      member.profileId,
      (actions) => {
        this.targetedCache.clearAll(this.roomId, session.uid);
        this.currentActions = actions;
        void this.publishAssigned();
      },
      (error) => void this.handleError(error)
    );
  }

  private async publishAssigned(): Promise<void> {
    if (!this.currentProfile || !this.session) return;
    this.cache.save(this.roomId, this.session.uid, this.currentProfile, this.currentActions);
    await this.options.syncActions(this.currentActions, {
      uid: this.session.uid,
      profile: this.currentProfile,
    });
    this.emit("ASSIGNED");
  }

  private async clearAssignment(state: PlayerToolbarState): Promise<void> {
    this.stopProfileSubscriptions();
    if (this.session) {
      this.cache.clear(this.roomId, this.session.uid);
      this.targetedCache.clearAll(this.roomId, this.session.uid);
    }
    this.currentProfile = null;
    this.currentActions = [];
    await this.options.syncActions([]);
    this.emit(state);
  }

  private async handleError(error: unknown): Promise<void> {
    const denied =
      error instanceof RepositoryError &&
      ["PERMISSION_DENIED", "INVALID_DATA", "UNSUPPORTED_SCHEMA"].includes(error.code);
    if (denied) {
      await this.clearAssignment("AUTHORIZATION_DENIED");
      return;
    }

    const cached = this.session ? this.cache.load(this.roomId, this.session.uid) : null;
    if (cached) {
      await this.options.syncActions(cached.actions, {
        uid: this.session!.uid,
        profile: cached.profile,
      });
      this.emit("OFFLINE_CACHE", error instanceof Error ? error.message : undefined);
      return;
    }
    await this.options.syncActions([]);
    this.emit("BACKEND_ERROR", error instanceof Error ? error.message : undefined);
  }

  private stopSubscriptions(): void {
    this.memberUnsubscribe?.();
    this.memberUnsubscribe = null;
    this.stopProfileSubscriptions();
  }

  private stopProfileSubscriptions(): void {
    this.profileUnsubscribe?.();
    this.actionsUnsubscribe?.();
    this.profileUnsubscribe = null;
    this.actionsUnsubscribe = null;
  }

  private emit(state: PlayerToolbarState, message?: string): void {
    this.options.onState?.(state, message);
  }
}
