## ADDED Requirements

### Requirement: Owlbear-Compatible SVG Assets
The extension SHALL provide every curated RPG Awesome toolbar icon as a browser-loadable standalone SVG that preserves the corresponding official glyph geometry, uses a consistent viewport and explicit 24 by 24 dimensions, and has transparent, monochromatic rendering suitable for Owlbear Rodeo native controls. The extension SHALL provide the overflow ellipsis as a separate project-owned standalone SVG because it is not an RPG Awesome glyph.

#### Scenario: Curated icon asset is inspected
- **WHEN** any icon ID in the curated icon catalog is resolved
- **THEN** its asset is a valid standalone SVG whose path corresponds to the same named RPG Awesome source glyph

#### Scenario: Production bundle is built
- **WHEN** Vite creates the production bundle
- **THEN** every curated SVG is available under `/icons/rpg-awesome/<icon-id>.svg` without geometry-changing transformation

### Requirement: Safe Native Icon Resolution
The extension SHALL pass absolute HTTP(S) URLs for valid curated SVG assets to Owlbear Rodeo Tool, ToolAction, and Context Menu APIs, and SHALL resolve an unknown or invalid persisted icon ID to the known `crossed-swords` fallback asset rather than an unavailable path.

#### Scenario: Valid action icon is registered
- **WHEN** an enabled action with a curated icon ID is synchronized to the native toolbar
- **THEN** its ToolAction icon is registered with an absolute URL for that icon's static SVG asset

#### Scenario: Invalid persisted icon is registered
- **WHEN** an action contains an icon ID outside the curated catalog
- **THEN** the native control receives an absolute URL for `crossed-swords.svg` and does not receive a URL derived from the invalid value

#### Scenario: Built-in native controls are registered
- **WHEN** the main Tool or token Context Menu item is created
- **THEN** each control receives an absolute URL to its configured curated RPG Awesome SVG asset

#### Scenario: Overflow native control is registered
- **WHEN** the overflow ToolAction is created
- **THEN** it receives an absolute URL to the project-owned ellipsis SVG asset
