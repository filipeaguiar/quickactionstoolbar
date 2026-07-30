## ADDED Requirements

### Requirement: Room Metadata Persistence
The extension SHALL read and persist all profile definitions, player assignments, and global settings in `OBR.room.metadata` under the key `com.seudominio.quick-actions/room-data`.

#### Scenario: Saving a character profile
- **WHEN** a profile is created or edited
- **THEN** the extension updates `OBR.room.metadata` while preserving data from other extensions

### Requirement: Scene Change Persistence
The extension SHALL maintain character action bars continuously when switching between different scenes within the same room.

#### Scenario: GM changes the active scene
- **WHEN** the GM switches from Scene A to Scene B
- **THEN** the connected players retain their active character action bars without losing profile data

### Requirement: UTF-8 Storage Capacity Measurement
The extension SHALL measure the total room metadata byte length and the extension metadata byte length using UTF-8 encoding (`TextEncoder().encode(JSON.stringify(data)).byteLength`).

#### Scenario: Inspecting metadata size
- **WHEN** reading room metadata
- **THEN** the extension calculates exact byte size, percentage of the 16 kB limit, and isolated extension footprint

### Requirement: Storage Limit Warning and Pre-Save Hard Lock
The extension SHALL simulate projected room metadata size prior to calling `setMetadata`. It SHALL issue a warning notification at 12 KB (75%) and block saving if projected size reaches or exceeds 15 KB (93.75%).

#### Scenario: Attempting to save when room metadata exceeds 15 KB
- **WHEN** the projected room metadata size is equal to or greater than 15,360 bytes
- **THEN** the save operation is rejected and an error notification is presented via `OBR.notification.show`

### Requirement: Role-Based Authorization
The extension SHALL enforce strict write authorization: GM users MAY edit any profile or global room settings; PLAYER users MAY only edit their own assigned profile if `playersCanEditOwnProfiles` is enabled, and SHALL NOT modify `playerAssignments` or `ownerPlayerId`.

#### Scenario: Player attempts to reassign a profile
- **WHEN** a non-GM player attempts to change `playerAssignments` or edit another player's profile
- **THEN** the save action is rejected with an authorization error

### Requirement: Optional Token Linkage
The extension SHALL allow linking tokens on the `"CHARACTER"` layer to a profile using `item.metadata["com.seudominio.quick-actions/profile-id"]`. Deleting a linked token SHALL NOT delete the character profile.

#### Scenario: Deleting a token linked to a profile
- **WHEN** a token is deleted from the scene
- **THEN** the corresponding `CharacterActionProfile` remains intact in the room metadata
