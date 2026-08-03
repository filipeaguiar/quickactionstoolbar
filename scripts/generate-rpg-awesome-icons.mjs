import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "node_modules/rpg-awesome/fonts/rpgawesome-webfont.svg");
const outputDir = resolve(projectRoot, "public/icons/rpg-awesome");
const customIconDir = resolve(projectRoot, "assets/icons");

const rpgAwesomeIcons = [
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

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function generateAssets() {
  const font = readFileSync(sourcePath, "utf8");
  const fontFaceTag = font.match(/<font-face\b[^>]*\/>/)?.[0];
  if (!fontFaceTag) throw new Error(`Missing <font-face> in ${sourcePath}`);

  const metrics = attributes(fontFaceTag);
  const unitsPerEm = Number(metrics["units-per-em"]);
  const ascent = Number(metrics.ascent);
  const descent = Number(metrics.descent);
  const viewportHeight = ascent - descent;
  if (!unitsPerEm || !Number.isFinite(ascent) || !Number.isFinite(descent) || viewportHeight !== unitsPerEm) {
    throw new Error(`Unsupported RPG Awesome font metrics: ${JSON.stringify(metrics)}`);
  }

  const glyphs = new Map();
  for (const match of font.matchAll(/<glyph\b[^>]*\/>/g)) {
    const glyph = attributes(match[0]);
    if (glyph["glyph-name"] && glyph.d) glyphs.set(glyph["glyph-name"], glyph.d);
  }

  const assets = new Map(
    rpgAwesomeIcons.map((icon) => {
      const path = glyphs.get(icon);
      if (!path) throw new Error(`Missing RPG Awesome glyph: ${icon}`);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 ${unitsPerEm} ${viewportHeight}" fill="#ffffff" aria-hidden="true" focusable="false">`,
        `  <path transform="translate(0 ${ascent}) scale(1 -1)" d="${path}"/>`,
        `</svg>`,
        ``,
      ].join("\n");
      return [`${icon}.svg`, svg];
    })
  );
  assets.set("d20.svg", readFileSync(resolve(customIconDir, "d20.svg"), "utf8"));
  return assets;
}

function check(assets) {
  const expectedFiles = new Set(assets.keys());
  const actualFiles = existsSync(outputDir)
    ? readdirSync(outputDir).filter((file) => file.endsWith(".svg"))
    : [];
  const errors = [];

  for (const [file, expected] of assets) {
    const path = resolve(outputDir, file);
    if (!existsSync(path)) errors.push(`Missing generated icon: ${file}`);
    else if (readFileSync(path, "utf8") !== expected) errors.push(`Stale generated icon: ${file}`);
  }
  for (const file of actualFiles) {
    if (!expectedFiles.has(file)) errors.push(`Unexpected generated icon: ${file}`);
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Verified ${assets.size} generated RPG Awesome icons.`);
  }
}

const assets = generateAssets();
if (process.argv.includes("--check")) {
  check(assets);
} else {
  mkdirSync(outputDir, { recursive: true });
  for (const file of readdirSync(outputDir).filter((name) => name.endsWith(".svg"))) {
    if (!assets.has(file)) rmSync(resolve(outputDir, file));
  }
  for (const [file, svg] of assets) writeFileSync(resolve(outputDir, file), svg);
  console.log(`Generated ${assets.size} RPG Awesome icons.`);
}
