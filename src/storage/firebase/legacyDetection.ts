import {
  CompactMigrationMarkerSchema,
  ROOM_DATA_KEY,
  RoomQuickActionsDataSchema,
  type RoomQuickActionsData,
} from "@/types/storage";
import { RepositoryError } from "./repositories";

export interface RoomMetadataReader {
  getMetadata(): Promise<Record<string, unknown>>;
}

const defaultReader: RoomMetadataReader = {
  async getMetadata() {
    const { default: OBR } = await import("@owlbear-rodeo/sdk");
    return OBR.room.getMetadata();
  },
};

export function parseLegacyRoomData(raw: unknown): RoomQuickActionsData | null {
  if (raw === undefined || raw === null) return null;
  if (CompactMigrationMarkerSchema.safeParse(raw).success) return null;

  const result = RoomQuickActionsDataSchema.safeParse(raw);
  if (!result.success) {
    throw new RepositoryError(
      "INVALID_DATA",
      "Os dados legados da sala são inválidos e não podem ser migrados automaticamente.",
      { cause: result.error }
    );
  }
  return result.data;
}

/** Reads and validates legacy data without creating, changing, or deleting metadata. */
export async function detectLegacyRoomData(
  reader: RoomMetadataReader = defaultReader
): Promise<RoomQuickActionsData | null> {
  const metadata = await reader.getMetadata();
  return parseLegacyRoomData(metadata[ROOM_DATA_KEY]);
}
