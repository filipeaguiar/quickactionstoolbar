import { describe, expect, it } from "vitest";
import {
  CURATED_ICONS,
  isValidIcon,
  resolveIconUrl,
  resolveOverflowIconUrl,
} from "../src/utils/iconResolver";

describe("Icon Resolver", () => {
  it("resolves every curated RPG Awesome icon to an absolute URL", () => {
    for (const icon of CURATED_ICONS) {
      const url = new URL(resolveIconUrl(icon));
      expect(["http:", "https:"]).toContain(url.protocol);
      expect(url.pathname).toBe(`/icons/rpg-awesome/${icon}.svg`);
      expect(isValidIcon(icon)).toBe(true);
    }
  });

  it("falls back instead of deriving a path from an invalid ID", () => {
    const invalidIds = ["", "dots-three", "crossed/swords..svg", "CROSSED-SWORDS"];
    for (const invalidId of invalidIds) {
      expect(new URL(resolveIconUrl(invalidId)).pathname).toBe(
        "/icons/rpg-awesome/crossed-swords.svg"
      );
      expect(isValidIcon(invalidId)).toBe(false);
    }
  });

  it("resolves the project-owned overflow ellipsis separately", () => {
    const url = new URL(resolveOverflowIconUrl());
    expect(["http:", "https:"]).toContain(url.protocol);
    expect(url.pathname).toBe("/icons/overflow.svg");
  });
});
