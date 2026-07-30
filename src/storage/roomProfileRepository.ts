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
 * Cria a estrutura inicial de dados da sala com um perfil padrão vazio, pronto para edição.
 */
export function createInitialRoomData(userId: string): RoomQuickActionsData {
  const profileId = "profile-default";
  return {
    schemaVersion: 1,
    profiles: {
      [profileId]: {
        id: profileId,
        name: "Personagem Padrão",
        ownerPlayerId: userId,
        ownerPlayerName: "Jogador 1",
        systemId: "dnd5e-2024",
        variables: {
          str: 4,
          dex: 3,
          prof: 2,
        },
        actions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    },
    playerAssignments: {
      [userId]: profileId,
    },
    settings: {
      playersCanEditOwnProfiles: true,
      maxVisibleActions: 8,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
}

/**
 * Lê os dados da sala ou inicializa um perfil padrão vazio caso seja uma sala nova.
 */
export async function getOrCreateRoomData(): Promise<RoomQuickActionsData> {
  const data = await getRoomData();
  if (data) return data;

  const currentUserId = OBR.player.id || "player-1";
  const initialData = createInitialRoomData(currentUserId);
  await saveRoomData(initialData);
  return initialData;
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

    // Limpa objetos Proxy do Vue 3 para permitir clonagem pelo postMessage do OBR SDK
    const cleanRoomData = JSON.parse(JSON.stringify(nextRoomData));

    // 4. Executar a gravação parcial no metadata da sala
    await OBR.room.setMetadata({
      [ROOM_DATA_KEY]: cleanRoomData,
    });

    return { success: true, metrics };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido ao salvar metadata.";
    await OBR.notification.show(`Falha ao salvar dados: ${errorMsg}`, "ERROR");
    return { success: false, error: errorMsg };
  }
}
