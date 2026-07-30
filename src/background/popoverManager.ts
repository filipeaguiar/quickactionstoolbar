import OBR from "@owlbear-rodeo/sdk";

export const ACTION_POPOVER_ID = "com.seudominio.quick-actions/action-popover";

/**
 * Abre o popover de seleção de variantes ancorado ao botão clicado.
 * @param actionId ID da ação selecionada
 * @param elementId ID do elemento nativo retornado no callback onClick
 */
export async function openActionPopover(actionId: string, elementId: string): Promise<void> {
  await OBR.popover.open({
    id: ACTION_POPOVER_ID,
    url: `/action-popover.html?actionId=${encodeURIComponent(actionId)}`,
    width: 330,
    height: 120,
    anchorElementId: elementId,
    anchorOrigin: {
      horizontal: "CENTER",
      vertical: "BOTTOM",
    },
    transformOrigin: {
      horizontal: "CENTER",
      vertical: "TOP",
    },
  });
}

/**
 * Abre o popover com as ações excedentes (overflow).
 * @param elementId ID do botão de overflow "Mais ações..."
 */
export async function openOverflowPopover(elementId: string): Promise<void> {
  await OBR.popover.open({
    id: ACTION_POPOVER_ID,
    url: `/action-popover.html?mode=overflow`,
    width: 300,
    height: 380,
    anchorElementId: elementId,
    anchorOrigin: {
      horizontal: "CENTER",
      vertical: "BOTTOM",
    },
    transformOrigin: {
      horizontal: "CENTER",
      vertical: "TOP",
    },
  });
}
