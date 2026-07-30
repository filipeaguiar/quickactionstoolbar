## ADDED Requirements

### Requirement: Strict Data Validation via Zod Schemas
The extension SHALL validate all character action profiles, action definitions, roll steps, and variant policies using Zod schemas (`CharacterActionProfileSchema`, `ActionDefinitionSchema`, `RollStepSchema`, `RollSequenceSchema`, `VariantPolicySchema`).

#### Scenario: Validating an invalid action definition
- **WHEN** an action with empty expression or invalid shortLabel (>12 chars) is parsed
- **THEN** the Zod validation fails with descriptive field errors

### Requirement: Character Profile Management UI (GM & Player)
The manager window (`manager.html`) SHALL render a profile selector allowing GMs to create, duplicate, rename, delete, and assign profiles to players from `OBR.party.getPlayers()`. Non-GM players SHALL only view and edit their assigned profile.

#### Scenario: GM assigns profile to player
- **WHEN** the GM changes player assignment for a profile
- **THEN** the assignment updates in room metadata and syncs across all connected clients

### Requirement: Action & Roll Step Builder UI
The manager SHALL render an action builder supporting reordering, editing name/icon/kind, adding/editing `RollStep` items (label, purpose, expression), and setting variant policies.

#### Scenario: Adding a roll step to an action
- **WHEN** a user adds a roll step with expression `1d20 + {{proficiency}} + {{strength}}`
- **THEN** the step is added to `action.sequence.steps` and validated via Zod

### Requirement: Variable Editor UI
The manager SHALL render a key-value variable editor for character stats (e.g. `strength: 4`, `proficiency: 3`).

#### Scenario: Editing character variables
- **WHEN** a user modifies a variable value in the manager
- **THEN** the profile variables map updates and triggers room metadata save

### Requirement: JSON Import & Export with Zod Validation
The manager SHALL allow exporting character profiles or full room configurations to JSON files, and importing JSON files with strict Zod schema validation.

#### Scenario: Importing an invalid JSON file
- **WHEN** a user imports a malformed JSON file or non-compliant schema
- **THEN** the import is rejected with an explicit error notification

### Requirement: RPG Awesome Icon Selection & Local Resolution
The manager SHALL render a visual icon selector supporting RPG Awesome icons via CSS classes (`ra ra-<icon>`) in Vue components and SVG files (`public/icons/rpg-awesome/<icon>.svg`) for native `ToolIcon` integration.

#### Scenario: Selecting an icon in the action editor
- **WHEN** a user picks the `crossed-swords` icon for an action
- **THEN** `action.icon` is set to `"crossed-swords"` and renders correctly in both manager UI and OBR action toolbar
