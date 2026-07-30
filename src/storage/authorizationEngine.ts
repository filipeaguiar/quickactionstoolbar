import { RoomQuickActionsData } from "@/types/storage";

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Valida se um usuário possui permissão para salvar alterações na estrutura de dados da sala.
 * @param currentRoomData Dados armazenados atualmente no metadata da sala
 * @param proposedData Dados propostos para gravação
 * @param userRole Papel do usuário ("GM" | "PLAYER")
 * @param currentUserId ID do jogador que tenta executar a gravação
 * @param targetProfileId ID do perfil específico sendo editado
 */
export function validateSavePermissions(
  currentRoomData: RoomQuickActionsData | null,
  proposedData: RoomQuickActionsData,
  userRole: "GM" | "PLAYER",
  currentUserId: string,
  targetProfileId?: string
): AuthorizationResult {
  // GM possui autorização irrestrita
  if (userRole === "GM") {
    return { allowed: true };
  }

  // Se não houver dados anteriores, apenas GM pode inicializar a sala
  if (!currentRoomData) {
    return {
      allowed: false,
      reason: "Apenas o GM pode inicializar a configuração da sala.",
    };
  }

  // 1. Jogadores não podem alterar atribuições de jogadores (playerAssignments)
  if (
    JSON.stringify(proposedData.playerAssignments) !==
    JSON.stringify(currentRoomData.playerAssignments)
  ) {
    return {
      allowed: false,
      reason: "Jogadores não podem alterar as atribuições de perfis da sala.",
    };
  }

  // 2. Jogadores não podem alterar as configurações globais da sala (settings)
  if (
    JSON.stringify(proposedData.settings) !==
    JSON.stringify(currentRoomData.settings)
  ) {
    return {
      allowed: false,
      reason: "Jogadores não podem alterar as configurações globais da sala.",
    };
  }

  // 3. Verificar permissão global de edição por jogadores
  if (!currentRoomData.settings.playersCanEditOwnProfiles) {
    return {
      allowed: false,
      reason: "O GM desativou a edição de perfis pelos jogadores nesta sala.",
    };
  }

  // 4. Se for a edição de um perfil específico, validar propriedade
  if (targetProfileId) {
    const assignedProfileId = currentRoomData.playerAssignments[currentUserId];
    if (assignedProfileId !== targetProfileId) {
      return {
        allowed: false,
        reason: "Você só tem permissão para editar o seu próprio perfil de personagem.",
      };
    }

    const proposedProfile = proposedData.profiles[targetProfileId];
    const currentProfile = currentRoomData.profiles[targetProfileId];

    // Impedir alteração do ownerPlayerId
    if (
      proposedProfile &&
      currentProfile &&
      proposedProfile.ownerPlayerId !== currentProfile.ownerPlayerId
    ) {
      return {
        allowed: false,
        reason: "Jogadores não podem alterar o proprietário de um perfil.",
      };
    }
  }

  return { allowed: true };
}
