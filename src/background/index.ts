import OBR from "@owlbear-rodeo/sdk";
import { registerMainTool } from "./registerTool";
import { syncToolActions, SimpleActionItem } from "./registerToolActions";
import { registerContextMenu } from "./registerContextMenu";
import { getRoomData } from "@/storage/roomProfileRepository";

const DEFAULT_FALLBACK_ACTIONS: SimpleActionItem[] = [
  {
    id: "attack-greataxe",
    name: "Ataque com Machado Grande",
    shortLabel: "Machado",
    icon: "crossed-swords",
    enabled: true,
    sortOrder: 10,
  },
  {
    id: "longbow-shot",
    name: "Tiro com Arco Longo",
    shortLabel: "Arco",
    icon: "crossed-swords",
    enabled: true,
    sortOrder: 20,
  },
];

async function updatePlayerBarFromRoomMetadata() {
  const roomData = await getRoomData();
  const currentUserId = OBR.player.id;

  if (roomData && roomData.playerAssignments[currentUserId]) {
    const profileId = roomData.playerAssignments[currentUserId];
    const profile = roomData.profiles[profileId];

    if (profile && profile.actions) {
      const actionsToSync: SimpleActionItem[] = profile.actions.map((act) => ({
        id: act.id,
        name: act.name,
        shortLabel: act.shortLabel,
        icon: act.icon,
        enabled: act.enabled,
        sortOrder: act.sortOrder,
      }));
      await syncToolActions(actionsToSync);
      return;
    }
  }

  // Fallback caso ainda não exista perfil configurado no metadata da room
  await syncToolActions(DEFAULT_FALLBACK_ACTIONS);
}

OBR.onReady(async () => {
  console.log("Quick Actions Toolbar - Background script pronto com suporte a Room Metadata.");

  try {
    await registerMainTool();
    await registerContextMenu();
    await updatePlayerBarFromRoomMetadata();

    // Listener para mudanças dinâmicas no metadata da sala
    OBR.room.onMetadataChange(async () => {
      await updatePlayerBarFromRoomMetadata();
    });

    // Listener para mudanças no jogador atual
    OBR.player.onChange(async () => {
      await updatePlayerBarFromRoomMetadata();
    });
  } catch (error) {
    console.error("Erro ao inicializar background script do Quick Actions:", error);
  }
});
