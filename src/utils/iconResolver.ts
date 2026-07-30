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
  const baseUrl =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://quickactionstoolbar.netlify.app";

  return `${baseUrl}/icons/rpg-awesome/${safeId}.svg`;
}

export function isValidIcon(iconId: string): boolean {
  return CURATED_ICONS.includes(iconId);
}
