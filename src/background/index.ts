import OBR from "@owlbear-rodeo/sdk";
import { registerMainTool } from "./registerTool";
import { syncToolActions, SimpleActionItem } from "./registerToolActions";
import { registerContextMenu } from "./registerContextMenu";
import { getOrCreateRoomData } from "@/storage/roomProfileRepository";




async function updatePlayerBarFromRoomMetadata() {
  const roomData = await getOrCreateRoomData();
  const currentUserId = OBR.player.id;

  const profileId = roomData.playerAssignments[currentUserId] || Object.keys(roomData.profiles)[0];
  if (profileId && roomData.profiles[profileId]) {
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
