import type { FirebaseSession } from "@/integrations/firebase/authSession";
import { nowIso } from "@/integrations/firebase/client";
import {
  CompactMigrationMarkerSchema,
  ROOM_DATA_KEY,
  type CompactMigrationMarker,
  type RoomQuickActionsData,
} from "@/types/storage";
import { detectLegacyRoomData, type RoomMetadataReader } from "./legacyDetection";
import type {
  LegacyDataExport,
  LegacyDataRetirementRepository,
  WorkspaceRepository,
} from "./repositories";

export interface RoomMetadataWriter extends RoomMetadataReader {
  setMetadata(update: Record<string, unknown>): Promise<void>;
}

const defaultMetadata: RoomMetadataWriter = {
  async getMetadata() {
    const { default: OBR } = await import("@owlbear-rodeo/sdk");
    return OBR.room.getMetadata();
  },
  async setMetadata(update) {
    const { default: OBR } = await import("@owlbear-rodeo/sdk");
    await OBR.room.setMetadata(update);
  },
};

async function fingerprint(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createLegacyExport(
  legacy: RoomQuickActionsData
): Promise<LegacyDataExport> {
  const json = `${JSON.stringify(legacy, null, 2)}\n`;
  return { json, fingerprint: await fingerprint(json) };
}

export class LegacyMetadataRetirementService implements LegacyDataRetirementRepository {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly metadata: RoomMetadataWriter = defaultMetadata
  ) {}

  detect(): Promise<RoomQuickActionsData | null> {
    return detectLegacyRoomData(this.metadata);
  }

  export(legacy: RoomQuickActionsData): Promise<LegacyDataExport> {
    return createLegacyExport(legacy);
  }

  async discard(roomId: string, ownerUid: string, exportFingerprint: string): Promise<void> {
    const workspace = await this.workspaceRepository.get(roomId);
    if (!workspace || workspace.ownerUid !== ownerUid) {
      throw new Error("Apenas o proprietário autenticado pode descartar os dados legados.");
    }

    const current = await this.detect();
    if (!current) throw new Error("Nenhum dado legado válido foi encontrado para descarte.");

    const currentExport = await this.export(current);
    if (currentExport.fingerprint !== exportFingerprint) {
      throw new Error("Os dados legados mudaram depois da exportação. Exporte novamente.");
    }

    const marker: CompactMigrationMarker = CompactMigrationMarkerSchema.parse({
      schemaVersion: 2,
      backend: "firebase",
      roomId,
      migrationFingerprint: currentExport.fingerprint,
      migratedAt: nowIso(),
    });
    await this.metadata.setMetadata({ [ROOM_DATA_KEY]: marker });
  }

  async discardAsOwner(
    roomId: string,
    role: "GM" | "PLAYER",
    session: FirebaseSession,
    exported: LegacyDataExport,
    confirmation: string
  ): Promise<void> {
    if (role !== "GM" || session.isAnonymous) {
      throw new Error("Apenas o GM autenticado pode descartar os dados legados.");
    }
    if (confirmation !== "DESCARTAR") {
      throw new Error("Confirmação de descarte inválida.");
    }
    await this.discard(roomId, session.uid, exported.fingerprint);
  }
}
