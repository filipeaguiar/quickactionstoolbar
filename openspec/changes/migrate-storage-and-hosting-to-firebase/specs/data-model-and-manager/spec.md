## MODIFIED Requirements

### Requirement: Character Profile Management UI (GM & Player)
The manager SHALL let the authenticated room owner create, duplicate, rename, delete, and assign Firestore-backed profiles to approved players matched against `OBR.party.getPlayers()`. Non-owner players SHALL have read-only access to their assignment state and assigned action usage, and SHALL NOT edit profiles or room configuration.

#### Scenario: GM assigns profile to player
- **WHEN** the owner approves a player's join request and selects a profile
- **THEN** the manager writes the member assignment to Firestore and the player's client synchronizes the assigned actions

#### Scenario: Player opens the manager entry point
- **WHEN** a non-owner opens the extension manager
- **THEN** editing controls are unavailable and the interface shows authentication, join-request, or current-assignment status

### Requirement: Variable Editor UI
The manager SHALL render a key-value variable editor for the owner to edit character stats and SHALL persist validated changes to the corresponding Firestore profile document.

#### Scenario: Editing character variables
- **WHEN** the owner modifies and saves a variable value in the manager
- **THEN** the profile variables map is validated, written to Firestore, and synchronized to the assigned player's action execution context

## ADDED Requirements

### Requirement: Join Request and Assignment UI
The manager SHALL show the owner pending Firebase join requests alongside current Owlbear party members and SHALL support approval, profile assignment, reassignment, and revocation.

#### Scenario: Owner views a pending player
- **WHEN** an anonymous player submits a join request while present in the Owlbear party
- **THEN** the manager displays identifiers sufficient for the owner to match and assign that player without treating the supplied name as proof of identity

#### Scenario: Owner revokes a member
- **WHEN** the owner removes a membership
- **THEN** the member loses profile access and their action toolbar is cleared after synchronization

### Requirement: Backend and Migration Status UI
The manager SHALL expose actionable states for owner sign-in, workspace initialization, legacy migration, online synchronization, validation errors, and recoverable backend failures.

#### Scenario: Existing metadata requires migration
- **WHEN** the manager detects valid legacy Room Metadata and no completed Firestore migration
- **THEN** it presents an explicit GM-only migration action and does not silently delete or overwrite legacy data
