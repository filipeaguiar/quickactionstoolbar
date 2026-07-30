## ADDED Requirements

### Requirement: Attack Modes Separate From Roll Outcomes
The action popover SHALL present Normal, Advantage, and Disadvantage as selectable attack modes and SHALL not present Critical as a manually selectable variant; critical status SHALL be derived from the returned attack roll.

#### Scenario: Opening an attack action popover
- **WHEN** the player opens an attack action that permits all standard attack modes
- **THEN** the popover displays Normal, Advantage, and Disadvantage without an Acerto Crítico button

#### Scenario: Attack returns a kept natural 20
- **WHEN** a player selects any available attack mode and the returned kept d20 is 20
- **THEN** the UI execution flow applies critical damage automatically without requiring another user selection

### Requirement: Roll Failure Feedback
The action popover SHALL keep the execution context open long enough to report a Dice+ result error or timeout instead of logging a false successful dispatch and closing silently.

#### Scenario: Dice+ result times out
- **WHEN** an attack or damage roll does not return a correlated result before timeout
- **THEN** the player receives visible failure feedback and remaining conditional steps are not silently treated as successful
