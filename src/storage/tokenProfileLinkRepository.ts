import OBR, { Item } from "@owlbear-rodeo/sdk";
import { PROFILE_REFERENCE_KEY } from "@/types/storage";

/**
 * Vincula um Item da layer CHARACTER a um perfil de personagem.
 */
export async function linkTokenToProfile(itemId: string, profileId: string): Promise<void> {
  await OBR.scene.items.updateItems([itemId], (items) => {
    for (const item of items) {
      if (item.layer === "CHARACTER") {
        item.metadata[PROFILE_REFERENCE_KEY] = profileId;
      }
    }
  });
}

/**
 * Obtém a referência de profileId associada a um Item.
 */
export function getTokenProfileId(item: Item): string | null {
  const ref = item.metadata[PROFILE_REFERENCE_KEY];
  return typeof ref === "string" ? ref : null;
}

/**
 * Remove o vínculo entre um Item e seu perfil (não exclui o perfil da sala).
 */
export async function unlinkTokenProfile(itemId: string): Promise<void> {
  await OBR.scene.items.updateItems([itemId], (items) => {
    for (const item of items) {
      delete item.metadata[PROFILE_REFERENCE_KEY];
    }
  });
}
