import type { RollHistoryRecord } from "@/types/firebase";
import type { RollHistoryRepository } from "@/storage/firebase/repositories";

export interface HistoryPersistenceResult {
  saved: boolean;
  error?: unknown;
}

export async function saveRollHistoryNonBlocking(
  repository: RollHistoryRepository,
  roomId: string,
  record: RollHistoryRecord | null
): Promise<HistoryPersistenceResult> {
  if (!record) return { saved: false };
  try {
    await repository.create(roomId, record);
    return { saved: true };
  } catch (error) {
    return { saved: false, error };
  }
}
