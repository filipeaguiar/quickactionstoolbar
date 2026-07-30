## ADDED Requirements

### Requirement: Attack Modes Separate From Roll Outcomes
The action popover SHALL present Normal, Advantage, and Disadvantage as selectable attack modes and SHALL not present Critical as a manually selectable variant; critical status SHALL be derived from the returned attack roll.

#### Scenario: Opening an attack action popover
- **WHEN** the player opens an attack action that permits all standard attack modes
- **THEN** the popover displays Normal, Advantage, and Disadvantage without an Acerto Crítico button

#### Scenario: Attack returns a kept natural 20
- **WHEN** a player selects any available attack mode and the returned kept d20 is 20
- **THEN** the UI execution flow applies critical damage automatically without requiring another user selection

#### Scenario: Variant toolbar is displayed
- **WHEN** the action popover opens
- **THEN** it displays the attack name above a transparent horizontal toolbar with square icon-only buttons using the action icon, colored neutral for Normal, green for Advantage, and red for Disadvantage

### Requirement: Roll Failure Feedback
The action popover SHALL keep the execution context open long enough to report a Dice+ result error or timeout instead of logging a false successful dispatch and closing silently.

#### Scenario: Dice+ result times out
- **WHEN** an attack or damage roll does not return a correlated result before timeout
- **THEN** the player receives visible failure feedback and remaining conditional steps are not silently treated as successful

### Requirement: Stable Anchored Action Popover
The extension SHALL preserve registered ToolAction elements when the effective visible action set has not changed, so room metadata and player events do not invalidate the open popover anchor.

#### Scenario: Unrelated room metadata changes while variants are open
- **WHEN** room metadata changes without changing the effective visible ToolActions
- **THEN** the extension does not remove or recreate those ToolActions and the action popover remains anchored

#### Scenario: Concurrent toolbar refresh events occur
- **WHEN** room and player events request toolbar synchronization concurrently
- **THEN** synchronization is serialized and duplicate ToolAction rebuilds are avoided

### Requirement: Critical Behavior Editing
The action editor SHALL allow each roll step to configure purpose, execution condition, and damage critical behavior, and SHALL default an eligible DAMAGE step without an explicit critical behavior to automatic dice doubling.

#### Scenario: Configuring an attack damage step
- **WHEN** a user marks a step as DAMAGE and saves it without disabling critical behavior
- **THEN** the step is stored with `criticalBehavior: "DOUBLE_DICE"`
