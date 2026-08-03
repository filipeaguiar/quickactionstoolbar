## MODIFIED Requirements

### Requirement: Room Metadata Persistence
The extension SHALL persist room configuration, profiles, actions, assignments, and settings in Cloud Firestore under `rooms/{OBR.room.id}` and SHALL NOT persist complete profile definitions in Owlbear Room Metadata. It MAY retain only a compact schema, migration, or backend marker needed for compatibility.

#### Scenario: Saving a character profile
- **WHEN** the authenticated owner creates or edits a profile
- **THEN** the extension writes validated profile and action documents to Firestore without increasing Room Metadata in proportion to the number of actions

#### Scenario: Player loads room configuration
- **WHEN** an approved member opens the room
- **THEN** the extension derives the workspace key from `OBR.room.id` and loads only the member's assigned Firestore data

### Requirement: Role-Based Authorization
The extension SHALL enforce owner-only configuration writes through Firebase Authentication and Firestore Security Rules. PLAYER users SHALL NOT edit profiles, actions, assignments, memberships, or global room settings; approved players MAY read and execute only their assigned profile and create authorized append-only roll records.

#### Scenario: Player attempts to edit assigned profile
- **WHEN** a non-owner attempts to modify their assigned profile or actions
- **THEN** Firestore Security Rules reject the write regardless of client UI state

#### Scenario: Owner edits room configuration
- **WHEN** the authenticated UID equals the room document's `ownerUid`
- **THEN** the owner may perform validated configuration and assignment writes

## ADDED Requirements

### Requirement: Validated Firestore Repository Boundary
The extension SHALL access Firebase persistence through repository interfaces and SHALL validate Firestore documents and supported schema versions before exposing them to UI or execution code.

#### Scenario: Firestore returns an invalid action document
- **WHEN** a document fails Zod validation or uses an unsupported schema version
- **THEN** the repository rejects it, preserves the last valid cache where applicable, and exposes an explicit data error

### Requirement: Assigned Action Cache
The extension SHALL cache the last validated assigned profile and action set for transient read failures, while clearing inaccessible data after confirmed assignment removal or authorization denial.

#### Scenario: Network disconnects after actions load
- **WHEN** an approved player temporarily loses Firestore connectivity
- **THEN** the toolbar may continue using the last validated cached action set and visibly indicates offline state

#### Scenario: Assignment is revoked
- **WHEN** the backend confirms that the player's membership or profile assignment was removed
- **THEN** the extension clears the registered actions and associated cached assignment

### Requirement: Explicit Legacy Metadata Discard
The extension SHALL NOT import legacy profiles, actions, variables, or assignments into Firestore. It SHALL let the authenticated owner export valid legacy data and explicitly replace it with a compact Firebase marker only after confirmation.

#### Scenario: Existing room opens on the Firebase version
- **WHEN** valid legacy Room Metadata is detected
- **THEN** the Firestore workspace starts empty and the legacy payload remains unchanged until the owner chooses export and discard

#### Scenario: GM discards legacy data
- **WHEN** the owner exports the legacy JSON and confirms discard
- **THEN** the extension replaces the large payload with a compact marker without creating profiles, actions, or memberships from the old data

## REMOVED Requirements

### Requirement: UTF-8 Storage Capacity Measurement
**Reason**: Complete room configuration no longer resides in the shared 16 kB Room Metadata payload, so its size is not the application's configuration capacity.

**Migration**: Replace the capacity display with backend synchronization, migration, and storage-status information; retain legacy measurement only inside the migration path while old data exists.

### Requirement: Storage Limit Warning and Pre-Save Hard Lock
**Reason**: Firestore configuration writes do not use the Owlbear 12 kB warning and 15 kB hard-lock thresholds.

**Migration**: Firestore repository errors, schema validation, quotas, and document-size constraints replace the Room Metadata pre-save lock; legacy migration still refuses unsafe metadata rewrites.
