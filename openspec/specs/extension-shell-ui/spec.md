## ADDED Requirements

### Requirement: Initialization of Extension Shell
The extension SHALL wait for `OBR.onReady()` in the background page (`background.html`) before registering tools or popovers.

#### Scenario: Extension loaded in Owlbear Rodeo room
- **WHEN** the user opens an Owlbear Rodeo room with the extension active
- **THEN** the background page executes `OBR.onReady()` and registers the main `Tool`

### Requirement: Native Main Tool Registration
The extension SHALL create exactly one main `Tool` registered with `OBR.tool.create` using ID `com.seudominio.quick-actions/tool` and icon `/icons/rpg-awesome/crossed-swords.svg`.

#### Scenario: Scene open in Owlbear Rodeo
- **WHEN** a scene is active in the room
- **THEN** the "Ações Rápidas" Tool icon appears on the right-hand native toolbar

### Requirement: Dynamic ToolAction Synchronization
The extension SHALL dynamically create and remove `ToolAction` buttons for active actions of the current player's profile, filtered by `activeTools: [TOOL_ID]`.

#### Scenario: Synchronizing player actions
- **WHEN** the player profile actions are updated or loaded
- **THEN** previously registered `ToolAction` items are removed via `OBR.tool.removeAction` and new `ToolAction` items are registered via `OBR.tool.createAction`

### Requirement: Visual Limit and Overflow Handling
The extension SHALL display at most 8 `ToolAction` buttons natively. If the active profile has more than 8 active actions, it SHALL display the first 7 actions and a 8th overflow button labeled "Mais ações...".

#### Scenario: Profile with 9 active actions
- **WHEN** a player profile contains 9 active actions
- **THEN** the toolbar renders 7 direct action buttons and 1 "Mais ações..." overflow button

### Requirement: Anchored Variant Selection Popover
The extension SHALL open an anchored `Popover` via `OBR.popover.open` using `anchorElementId: elementId` when a `ToolAction` is clicked.

#### Scenario: Clicking an action button
- **WHEN** a user clicks on a `ToolAction` button
- **THEN** the extension opens `/action-popover.html` anchored to the clicked button's element ID

### Requirement: ManifestAction Manager Integration
The extension SHALL define an `action` in `manifest.json` pointing to `/manager.html` to open the full manager editor.

#### Scenario: Clicking the extension icon in the room header
- **WHEN** a user clicks the extension icon in the top-left action menu
- **THEN** the Owlbear Rodeo opens the manager popover displaying `/manager.html`

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
