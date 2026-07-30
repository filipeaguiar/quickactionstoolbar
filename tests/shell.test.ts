import { describe, it, expect } from "vitest";
import { resolveIconUrl } from "../src/utils/iconResolver";

describe("Icon Resolver", () => {
  it("should format RPG Awesome icon paths correctly with absolute URLs", () => {
    expect(resolveIconUrl("crossed-swords")).toContain("/icons/rpg-awesome/crossed-swords.svg");
    expect(resolveIconUrl("broadsword")).toContain("/icons/rpg-awesome/broadsword.svg");
  });

  it("should sanitize invalid characters in icon names", () => {
    expect(resolveIconUrl("crossed/swords..svg")).toContain("/icons/rpg-awesome/crossedswordssvg.svg");
  });
});
