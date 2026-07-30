## MODIFIED Requirements

### Requirement: Critical Hit Transformation on AST
The system SHALL automatically double the number of dice for `DAMAGE` purpose steps whose `criticalBehavior` is `DOUBLE_DICE` when the governing attack result is critical, while preserving flat modifier numbers and leaving `NONE` damage unchanged.

#### Scenario: Applying automatic critical hit to damage roll
- **WHEN** the kept attack d20 has natural value 20 and a damage step has expression `1d12 + 1d6 + 4` with `criticalBehavior: "DOUBLE_DICE"`
- **THEN** the resulting damage expression SHALL be `2d12 + 2d6 + 4`

#### Scenario: Preserving normal damage
- **WHEN** the kept attack d20 has a value other than 20
- **THEN** the damage expression SHALL retain its original dice counts

#### Scenario: Critical behavior disabled
- **WHEN** the kept attack d20 is 20 and a damage step has `criticalBehavior: "NONE"`
- **THEN** the damage expression SHALL retain its original dice counts

## ADDED Requirements

### Requirement: Natural Attack Critical Classification
The D&D 2024 System Pack SHALL classify an attack as critical only when the Dice+ result for that `ATTACK` step contains a kept d20 with natural value 20.

#### Scenario: Natural 20 on a normal attack
- **WHEN** an attack result contains a kept d20 with `value: 20`
- **THEN** the attack is classified as critical regardless of its modified total

#### Scenario: Modified total reaches 20 without natural 20
- **WHEN** an attack result has total 20 or greater but its kept d20 value is less than 20
- **THEN** the attack is not classified as critical

#### Scenario: Natural 20 is discarded by disadvantage
- **WHEN** an attack result contains a d20 with value 20 and `kept: false` while another d20 is kept
- **THEN** the attack is not classified as critical from the discarded die

#### Scenario: Natural 20 is kept with advantage
- **WHEN** an attack result contains a d20 with value 20 and `kept: true`
- **THEN** the attack is classified as critical even when another d20 was rolled

### Requirement: Conditional Step Execution
The action executor SHALL preserve and enforce `ALWAYS`, `ON_HIT`, and `ON_CRITICAL` conditions using the most recent preceding attack result, and SHALL resolve damage only after that attack result is known.

#### Scenario: Critical-only step after critical attack
- **WHEN** an `ON_CRITICAL` step follows an attack classified as critical
- **THEN** the step is resolved and dispatched

#### Scenario: Critical-only step after non-critical attack
- **WHEN** an `ON_CRITICAL` step follows an attack not classified as critical
- **THEN** the step is skipped

#### Scenario: Hit-conditioned damage without armor class
- **WHEN** an `ON_HIT` step follows a successfully completed attack roll and no armor class evaluation is available
- **THEN** the step executes to preserve the existing behavior

#### Scenario: Conditional step without preceding attack
- **WHEN** an `ON_HIT` or `ON_CRITICAL` step has no preceding attack result
- **THEN** the step is skipped
