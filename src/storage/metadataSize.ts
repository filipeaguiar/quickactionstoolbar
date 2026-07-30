import { RoomQuickActionsData, ROOM_DATA_KEY } from "@/types/storage";

export const DOCUMENTED_LIMIT = 16384; // 16 kB
export const WARNING_THRESHOLD = 12288; // 12 KB (75%)
export const HARD_LOCK_THRESHOLD = 15360; // 15 KB (93.75%)

export interface CapacityMetrics {
  totalRoomBytes: number;
  extensionBytes: number;
  projectedTotalBytes: number;
  availableBytes: number;
  status: "OK" | "WARNING" | "BLOCKED";
}

/**
 * Calcula o tamanho aproximado em bytes UTF-8 de um valor serializável em JSON.
 */
export function jsonUtf8Size(value: unknown): number {
  if (value === undefined) return 0;
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/**
 * Simula a capacidade do Room Metadata antes de executar uma gravação.
 * @param nextRoomData Dados projetados da extensão
 * @param currentRoomMetadata Metadata atual completo da Room (opcional para testes)
 */
export function simulateSaveCapacity(
  nextRoomData: RoomQuickActionsData,
  currentRoomMetadata: Record<string, unknown> = {}
): CapacityMetrics {
  const currentTotalBytes = jsonUtf8Size(currentRoomMetadata);
  const extensionBytes = jsonUtf8Size(nextRoomData);

  const simulatedMetadata = {
    ...currentRoomMetadata,
    [ROOM_DATA_KEY]: nextRoomData,
  };
  const projectedTotalBytes = jsonUtf8Size(simulatedMetadata);

  let status: CapacityMetrics["status"] = "OK";
  if (projectedTotalBytes >= HARD_LOCK_THRESHOLD) {
    status = "BLOCKED";
  } else if (projectedTotalBytes >= WARNING_THRESHOLD) {
    status = "WARNING";
  }

  return {
    totalRoomBytes: currentTotalBytes,
    extensionBytes,
    projectedTotalBytes,
    availableBytes: Math.max(0, DOCUMENTED_LIMIT - projectedTotalBytes),
    status,
  };
}
