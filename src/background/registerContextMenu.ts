import OBR from "@owlbear-rodeo/sdk";
import { resolveIconUrl } from "@/utils/iconResolver";

export const CONTEXT_MENU_LINK_ID = "com.seudominio.quick-actions/link-character-profile";

/**
 * Registra o item do menu de contexto para tokens da layer CHARACTER (visível para GMs com permissão UPDATE).
 */
export async function registerContextMenu(): Promise<void> {
  await OBR.contextMenu.create({
    id: CONTEXT_MENU_LINK_ID,
    icons: [
      {
        icon: resolveIconUrl("cog"),
        label: "Vincular Ações Rápidas",
        filter: {
          min: 1,
          max: 1,
          roles: ["GM"],
          permissions: ["UPDATE"],
          every: [
            {
              key: "layer",
              value: "CHARACTER",
            },
          ],
        },
      },
    ],
    onClick(context) {
      const selectedItem = context.items[0];
      if (selectedItem) {
        OBR.notification.show(
          `Selecione o perfil para o token "${selectedItem.name || selectedItem.id}" no gerenciador.`,
          "INFO"
        );
      }
    },
  });
}
