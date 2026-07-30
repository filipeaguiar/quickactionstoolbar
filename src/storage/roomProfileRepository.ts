import OBR from "@owlbear-rodeo/sdk";
import { RoomQuickActionsData, ROOM_DATA_KEY } from "@/types/storage";
import { simulateSaveCapacity, CapacityMetrics } from "./metadataSize";
import { validateSavePermissions } from "./authorizationEngine";

/**
 * Lê os dados da extensão do metadata da Room.
 */
export async function getRoomData(): Promise<RoomQuickActionsData | null> {
  const metadata = await OBR.room.getMetadata();
  const rawData = metadata[ROOM_DATA_KEY];
  if (!rawData || typeof rawData !== "object") {
    return null;
  }
  return rawData as RoomQuickActionsData;
}

/**
 * Salva os dados atualizados no metadata da Room com validação de autorização e simulação de capacidade UTF-8.
 */
export async function saveRoomData(
  nextRoomData: RoomQuickActionsData,
  targetProfileId?: string
): Promise<{ success: boolean; metrics?: CapacityMetrics; error?: string }> {
  try {
    const currentMetadata = await OBR.room.getMetadata();
    const currentRoomData = (currentMetadata[ROOM_DATA_KEY] as RoomQuickActionsData) || null;

    // 1. Validar autorização por Role (GM vs PLAYER)
    const role = await OBR.player.getRole();
    const currentUserId = OBR.player.id;

    const auth = validateSavePermissions(
      currentRoomData,
      nextRoomData,
      role as "GM" | "PLAYER",
      currentUserId,
      targetProfileId
    );

    if (!auth.allowed) {
      const errorMsg = auth.reason || "Alteração não autorizada.";
      await OBR.notification.show(errorMsg, "ERROR");
      return { success: false, error: errorMsg };
    }

    // 2. Simular capacidade UTF-8
    const metrics = simulateSaveCapacity(nextRoomData, currentMetadata);

    if (metrics.status === "BLOCKED") {
      const errorMsg = "Limite de armazenamento da sala atingido (máx 15 KB). Gravação bloqueada.";
      await OBR.notification.show(errorMsg, "ERROR");
      return { success: false, metrics, error: errorMsg };
    }

    if (metrics.status === "WARNING") {
      await OBR.notification.show(
        "Aviso: O armazenamento da sala ultrapassou 12 KB. Considere exportar backups JSON.",
        "WARNING"
      );
    }

    // 3. Atualizar timestamps
    nextRoomData.updatedAt = new Date().toISOString();
    nextRoomData.updatedBy = currentUserId;

    // 4. Executar a gravação parcial no metadata da sala
    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: nextRoomData,
    });

    return { success: true, metrics };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido ao salvar metadata.";
    await OBR.notification.show(`Falha ao salvar dados: ${errorMsg}`, "ERROR");
    return { success: false, error: errorMsg };
  }
}
