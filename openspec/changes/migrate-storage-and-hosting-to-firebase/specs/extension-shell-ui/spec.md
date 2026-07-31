## MODIFIED Requirements

### Requirement: Dynamic ToolAction Synchronization
The extension SHALL dynamically create and remove `ToolAction` buttons from the authenticated member's currently assigned Firestore profile, filtered by `activeTools: [TOOL_ID]`, and SHALL preserve stable native actions when the effective action set is unchanged.

#### Scenario: Synchronizing assigned player actions
- **WHEN** an approved member's assigned Firestore actions are initially loaded or changed
- **THEN** the extension registers the effective enabled action set and removes obsolete ToolActions

#### Scenario: Player has no approved assignment
- **WHEN** authentication, membership, or profile assignment is absent
- **THEN** the extension registers no character ToolActions and exposes an appropriate waiting or access state

#### Scenario: Temporary backend disconnect occurs
- **WHEN** Firestore becomes temporarily unavailable after a validated assigned action set was cached
- **THEN** the extension may preserve those actions with visible offline status instead of silently replacing them with an empty set

## ADDED Requirements

### Requirement: Firebase Session and Workspace Initialization
The extension shell SHALL initialize Firebase and resolve authentication before subscribing to the `rooms/{OBR.room.id}` workspace or synchronizing player actions.

#### Scenario: Extension background starts
- **WHEN** both `OBR.onReady()` and Firebase authentication initialization complete
- **THEN** the shell subscribes only to workspace data authorized for the current UID

### Requirement: Explicit Access States
The extension UI SHALL distinguish loading, owner-sign-in-required, workspace-not-initialized, awaiting-approval, assigned, offline-cache, authorization-denied, migration-required, and backend-error states.

#### Scenario: Player is waiting for GM approval
- **WHEN** an anonymous session has a join request but no membership
- **THEN** the UI indicates that the GM must assign a profile and does not present stale or unrelated actions

#### Scenario: Firestore denies access
- **WHEN** a profile or action subscription returns an authorization error
- **THEN** the toolbar is cleared unless a specifically permitted offline-cache state applies, and the UI reports the access problem
