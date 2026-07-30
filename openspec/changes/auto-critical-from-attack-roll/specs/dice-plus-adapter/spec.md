## MODIFIED Requirements

### Requirement: Roll Sequence Dispatch
The system SHALL dispatch each eligible `ResolvedRollStep` as a Dice+ roll request, await a correlated response before advancing, and return a failed `RollDispatchResult` if a required step returns an error or times out.

#### Scenario: Successful sequential roll dispatch
- **WHEN** an action executor submits eligible resolved steps and Dice+ returns a matching result for each `rollId`
- **THEN** each step is dispatched only after the previous step result is available and the final dispatch result is successful

#### Scenario: Roll response times out
- **WHEN** Dice+ does not return a matching result or error before the configured step timeout
- **THEN** the adapter returns a failure and does not represent the timeout as a successful roll

## ADDED Requirements

### Requirement: Structured Dice+ Roll Result Reception
The adapter SHALL subscribe to `dice-plus/roll-result` and `dice-plus/roll-error`, normalize direct and Owlbear-nested broadcast envelopes, correlate responses by `rollId`, and return typed result data including each group's dice type and each die's natural value and kept status.

#### Scenario: Matching result is received
- **WHEN** `dice-plus/roll-result` contains the pending `rollId`
- **THEN** the adapter unsubscribes its result and error listeners and returns the structured `result.groups[].dice[]` data

#### Scenario: Unrelated result is received
- **WHEN** a result arrives with a different `rollId`
- **THEN** the adapter ignores it and continues waiting for the pending roll

#### Scenario: Matching error is received
- **WHEN** `dice-plus/roll-error` contains the pending `rollId`
- **THEN** the adapter unsubscribes its listeners and returns a failed step result

#### Scenario: Owlbear wraps the result payload
- **WHEN** a broadcast callback contains the Dice+ payload in a nested `data` envelope with connection metadata
- **THEN** the adapter extracts the inner payload before correlating its `rollId`

#### Scenario: Special-roll animation delays publication
- **WHEN** Dice+ plays a natural 1 or natural 20 animation before publishing the correlated result
- **THEN** the step timeout allows the documented animation window before reporting failure
