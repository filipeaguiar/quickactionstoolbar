import { describe, it, expect } from "vitest";
import { resolveIconUrl } from "../src/utils/iconResolver";

describe("Icon Resolver", () => {
  it("should format RPG Awesome icon paths correctly", () => {
    expect(resolveIconUrl("crossed-swords")).toBe("/icons/rpg-awesome/crossed-swords.svg");
    expect(resolveIconUrl("broadsword")).toBe("/icons/rpg-awesome/broadsword.svg");
  });

  it("should sanitize invalid characters in icon names", () => {
    expect(resolveIconUrl("crossed/swords..svg")).toBe("/icons/rpg-awesome/crossedswordssvg.svg");
  });
});
