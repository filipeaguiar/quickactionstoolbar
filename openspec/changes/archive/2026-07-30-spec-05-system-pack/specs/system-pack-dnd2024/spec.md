## ADDED Requirements

### Requirement: D&D 2024 System Pack Registration and Interface
The system SHALL provide a `dnd5e-2024` System Pack implementing the `SystemPack` interface for D&D 2024 rules resolution.

#### Scenario: Registering D&D 2024 System Pack
- **WHEN** the system initializes the SystemPackManager
- **THEN** the `dnd5e-2024` pack is registered and available for selection in Action definitions

### Requirement: Advantage Transformation on AST
The system SHALL transform d20 roll steps for `ATTACK`, `CHECK`, and `SAVE` purposes when `ADVANTAGE` variant is selected, changing `1d20` into `2d20kh1`.

#### Scenario: Applying Advantage to Attack Roll
- **WHEN** an attack action with expression `1d20 + 5` is resolved with `ADVANTAGE` variant
- **THEN** the resulting expression for the attack step SHALL be `2d20kh1 + 5`

### Requirement: Disadvantage Transformation on AST
The system SHALL transform d20 roll steps for `ATTACK`, `CHECK`, and `SAVE` purposes when `DISADVANTAGE` variant is selected, changing `1d20` into `2d20kl1`.

#### Scenario: Applying Disadvantage to Save Roll
- **WHEN** a save action with expression `1d20 + 3` is resolved with `DISADVANTAGE` variant
- **THEN** the resulting expression for the save step SHALL be `2d20kl1 + 3`

### Requirement: Critical Hit Transformation on AST
The system SHALL double the number of dice for `DAMAGE` purpose steps when `CRITICAL` variant is selected, while preserving flat modifier numbers.

#### Scenario: Applying Critical Hit to Damage Roll
- **WHEN** a damage step with expression `1d12 + 1d6 + 4` is resolved with `CRITICAL` variant
- **THEN** the resulting expression for the damage step SHALL be `2d12 + 2d6 + 4`

### Requirement: Custom Variant Resolution
The system SHALL support custom action variants such as Reckless Attack, applying Advantage selectively to attack steps while keeping damage steps normal.

#### Scenario: Resolving Reckless Attack
- **WHEN** a Reckless Attack variant is applied to an action with attack and damage steps
- **THEN** the attack step expression transforms to `2d20kh1 + MOD` and damage step remains `1d12 + MOD`
