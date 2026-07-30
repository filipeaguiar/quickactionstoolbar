import OBR from "@owlbear-rodeo/sdk";
import { resolveIconUrl } from "@/utils/iconResolver";

export const TOOL_ID = "com.seudominio.quick-actions/tool";

/**
 * Registra o Tool principal de ações rápidas no Owlbear Rodeo.
 */
export async function registerMainTool(): Promise<void> {
  await OBR.tool.create({
    id: TOOL_ID,
    icons: [
      {
        icon: resolveIconUrl("crossed-swords"),
        label: "Ações Rápidas",
      },
    ],
    defaultMetadata: {
      activeProfileId: null,
    },
  });
}
