## 1. Canonical SVG Generation

- [x] 1.1 Add a deterministic script that extracts every curated RPG Awesome glyph path and font metrics from `rpgawesome-webfont.svg`, emits standalone 24×24 SVG assets with the required coordinate transform and monochromatic paint, and provide a separate project-owned ellipsis SVG for overflow
- [x] 1.2 Regenerate all files in `public/icons/rpg-awesome/`, remove the non-RPG-Awesome `dots-three` asset, and verify generated paths match the corresponding source glyphs without clipping
- [x] 1.3 Add the icon-generation/check command to `package.json` so stale or missing generated assets can be detected reproducibly

## 2. Safe Icon Resolution

- [x] 2.1 Update `resolveIconUrl` to accept only exact curated IDs and resolve invalid or unknown values to `crossed-swords`
- [x] 2.2 Confirm main Tool, dynamic ToolActions, overflow action, and Context Menu registrations all use the safe absolute URL resolver

## 3. Automated Verification

- [x] 3.1 Extend resolver tests to cover absolute URLs, all curated IDs, invalid-ID fallback, and prevention of derived missing paths
- [x] 3.2 Add asset tests for SVG validity, 24×24 dimensions, common viewBox/transform, transparent monochromatic structure, and source-glyph path fidelity
- [x] 3.3 Add registration tests with a mocked OBR SDK to verify valid absolute SVG URLs for Tool, ToolAction, overflow, and Context Menu payloads
- [x] 3.4 Run the production build and verify every curated asset is copied unchanged to `dist/icons/rpg-awesome/`

## 4. Final Validation

- [x] 4.1 Run the full test suite and production build successfully
- [ ] 4.2 Manually verify representative simple and complex icons in Owlbear Rodeo native controls, including toolbar and Context Menu contrast
