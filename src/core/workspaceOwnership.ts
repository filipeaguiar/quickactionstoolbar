import type { FirebaseSession } from "@/integrations/firebase/authSession";
import type { RoomWorkspace } from "@/types/firebase";
import type { WorkspaceRepository } from "@/storage/firebase/repositories";

export type WorkspaceAccessState =
  | { status: "NOT_INITIALIZED" }
  | { status: "OWNER"; workspace: RoomWorkspace }
  | { status: "MEMBER"; workspace: RoomWorkspace };

export class WorkspaceOwnershipService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async resolve(roomId: string, session: FirebaseSession): Promise<WorkspaceAccessState> {
    const workspace = await this.workspaceRepository.get(roomId);
    if (!workspace) return { status: "NOT_INITIALIZED" };
    return workspace.ownerUid === session.uid
      ? { status: "OWNER", workspace }
      : { status: "MEMBER", workspace };
  }

  async initialize(
    roomId: string,
    owlbearRole: "GM" | "PLAYER",
    session: FirebaseSession
  ): Promise<RoomWorkspace> {
    if (owlbearRole !== "GM") {
      throw new Error("Apenas o GM pode iniciar a configuração da sala.");
    }
    if (session.isAnonymous) {
      throw new Error("O GM precisa entrar com uma conta permanente antes de criar a sala.");
    }
    return this.workspaceRepository.create(roomId, session.uid);
  }
}
