export const CURATED_ICONS = [
  "broadsword",
  "crossed-swords",
  "axe",
  "shield",
  "lightning-bolt",
  "fire",
  "frostfire",
  "health",
  "health-increase",
  "targeted",
  "archery-target",
  "footprint",
  "scroll-unfurled",
  "dice-six",
  "cog",
];

export function resolveIconUrl(iconId: string): string {
  const safeId = iconId.replace(/[^a-z0-9-]/g, "");
  return `/icons/rpg-awesome/${safeId}.svg`;
}

export function isValidIcon(iconId: string): boolean {
  return CURATED_ICONS.includes(iconId);
}
