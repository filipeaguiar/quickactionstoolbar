import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CURATED_ICONS } from "../src/utils/iconResolver";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = resolve(projectRoot, "public/icons/rpg-awesome");
const font = readFileSync(
  resolve(projectRoot, "node_modules/rpg-awesome/fonts/rpgawesome-webfont.svg"),
  "utf8"
);

function sourceGlyphPath(icon: string): string {
  const glyphTag = [...font.matchAll(/<glyph\b[^>]*\/>/g)].find((match) =>
    match[0].includes(`glyph-name="${icon}"`)
  )?.[0];
  const path = glyphTag?.match(/\bd="([^"]+)"/)?.[1];
  if (!path) throw new Error(`Missing source glyph ${icon}`);
  return path;
}

describe("generated RPG Awesome SVG assets", () => {
  it("are current and reproducible", () => {
    expect(() =>
      execFileSync(process.execPath, ["scripts/generate-rpg-awesome-icons.mjs", "--check"], {
        cwd: projectRoot,
        stdio: "pipe",
      })
    ).not.toThrow();
  });

  it.each(CURATED_ICONS.filter((icon) => icon !== "d20"))(
    "preserves the %s source glyph in a common SVG viewport",
    (icon) => {
      const svg = readFileSync(resolve(iconDir, `${icon}.svg`), "utf8");

      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(svg).toContain('width="24" height="24"');
      expect(svg).toContain('viewBox="0 0 1024 1024"');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('transform="translate(0 960) scale(1 -1)"');
      expect(svg).toContain(`d="${sourceGlyphPath(icon)}"`);
      expect(svg).not.toMatch(/<(?:rect|image)\b/);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    }
  );

  it("provides a project-owned d20 icon for generic test rolls", () => {
    const svg = readFileSync(resolve(iconDir, "d20.svg"), "utf8");
    expect(svg).toContain('viewBox="0 0 1024 1024"');
    expect(svg).toContain('stroke="#ffffff"');
    expect(svg).toContain(">20</text>");
    expect(svg).not.toContain("<image");
  });

  it("provides a standalone project-owned three-dot overflow icon", () => {
    const svg = readFileSync(resolve(projectRoot, "public/icons/overflow.svg"), "utf8");
    expect(svg).toContain('width="24" height="24" viewBox="0 0 24 24"');
    expect(svg.match(/<circle\b/g)).toHaveLength(3);
    expect(svg).toContain('fill="#ffffff"');
  });
});
