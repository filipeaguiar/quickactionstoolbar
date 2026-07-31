## ADDED Requirements

### Requirement: Append-Only Roll History
The system SHALL persist a bounded summary of each completed action execution under `rooms/{roomId}/rolls/{rollId}` and SHALL make player-created history records immutable.

#### Scenario: Player completes an attack and damage action
- **WHEN** Dice+ returns correlated successful outcomes for an assigned action
- **THEN** the extension creates one history record containing the authenticated UID, profile and action identifiers, mode, summarized attack/damage outcomes, critical or automatic-miss classification, and server timestamp

#### Scenario: Player attempts to alter a previous roll
- **WHEN** a non-owner attempts to update or delete an existing roll record
- **THEN** Firestore Security Rules reject the operation

### Requirement: Roll Ownership Validation
A member SHALL create history only for their own authenticated UID and currently assigned profile, and history input SHALL be schema validated before submission.

#### Scenario: Member submits a roll for another profile
- **WHEN** a member creates a roll whose `profileId` differs from their membership assignment
- **THEN** the write is rejected

#### Scenario: History summary is malformed
- **WHEN** a generated record fails the roll-history schema
- **THEN** the extension does not submit it and reports a diagnostic without corrupting existing history

### Requirement: Non-Blocking History Failure
History persistence failure SHALL NOT change a successfully completed Dice+ execution into a failed physical roll.

#### Scenario: Firestore is unavailable after Dice+ succeeds
- **WHEN** action execution succeeds but the history write fails
- **THEN** the roll remains successful, the user receives non-blocking status feedback, and the failure is available for retry or diagnostics

### Requirement: Paginated and Retained History
The system SHALL query roll history in bounded newest-first pages and SHALL support a configured retention policy without subscribing clients to the unbounded collection.

#### Scenario: GM opens roll history
- **WHEN** the owner requests history
- **THEN** the extension loads only the configured first page and uses a cursor for additional pages

#### Scenario: Records exceed retention policy
- **WHEN** roll records become older or more numerous than the configured retention policy
- **THEN** an authorized cleanup mechanism removes eligible records without affecting profiles or actions
