import OBR from "@owlbear-rodeo/sdk";
import { TOOL_ID } from "./registerTool";
import { resolveIconUrl, resolveOverflowIconUrl } from "@/utils/iconResolver";
import { openActionPopover, openOverflowPopover } from "./popoverManager";

export interface SimpleActionItem {
  id: string;
  name: string;
  shortLabel?: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
}

// Armazena a lista de IDs de ToolActions registrados atualmente
let registeredActionIds: string[] = [];

/**
 * Sincroniza a barra de ToolActions com a lista de ações visíveis do jogador.
 * @param actions Lista de ações ativas do perfil do jogador
 */
export async function syncToolActions(actions: SimpleActionItem[]): Promise<void> {
  // 1. Remover todos os ToolActions registrados anteriormente
  for (const registeredId of registeredActionIds) {
    try {
      await OBR.tool.removeAction(registeredId);
    } catch {
      // Ignorar erros caso já tenha sido removido
    }
  }
  registeredActionIds = [];

  // 2. Filtrar e ordenar ações ativas por sortOrder
  const visibleActions = actions
    .filter((a) => a.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (visibleActions.length === 0) {
    return;
  }

  // 3. Regra de Capacidade Visual de 8 Botões
  const MAX_DIRECT_ACTIONS = 8;
  const hasOverflow = visibleActions.length > MAX_DIRECT_ACTIONS;
  const directActions = hasOverflow ? visibleActions.slice(0, 7) : visibleActions;

  // 4. Criar os ToolActions diretos
  for (const action of directActions) {
    const actionId = `${TOOL_ID}/action/${action.id}`;
    registeredActionIds.push(actionId);

    await OBR.tool.createAction({
      id: actionId,
      icons: [
        {
          icon: resolveIconUrl(action.icon),
          label: action.shortLabel || action.name,
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      onClick(_context, elementId) {
        openActionPopover(action.id, elementId);
      },
    });
  }

  // 5. Caso haja overflow (9 ou mais ações), registrar botão "Mais ações..."
  if (hasOverflow) {
    const overflowId = `${TOOL_ID}/action/overflow`;
    registeredActionIds.push(overflowId);

    await OBR.tool.createAction({
      id: overflowId,
      icons: [
        {
          icon: resolveOverflowIconUrl(),
          label: "Mais ações...",
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      onClick(_context, elementId) {
        openOverflowPopover(elementId);
      },
    });
  }
}
