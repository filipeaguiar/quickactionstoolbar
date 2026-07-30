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

const DEFAULT_ICON = "crossed-swords";
const PRODUCTION_ORIGIN = "https://quickactionstoolbar.netlify.app";

function extensionOrigin(): string {
  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : PRODUCTION_ORIGIN;
}

export function resolveIconUrl(iconId: string): string {
  const resolvedId = isValidIcon(iconId) ? iconId : DEFAULT_ICON;
  return `${extensionOrigin()}/icons/rpg-awesome/${resolvedId}.svg`;
}

export function resolveOverflowIconUrl(): string {
  return `${extensionOrigin()}/icons/overflow.svg`;
}

export function isValidIcon(iconId: string): boolean {
  return CURATED_ICONS.includes(iconId);
}
