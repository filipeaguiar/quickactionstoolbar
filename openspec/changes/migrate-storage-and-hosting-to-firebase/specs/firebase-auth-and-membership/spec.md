## ADDED Requirements

### Requirement: Durable GM Workspace Ownership
The system SHALL require a durable Firebase-authenticated identity to initialize a room workspace and SHALL store that identity as `ownerUid`; only the owner SHALL create, update, or delete room settings, profiles, actions, memberships, and assignments.

#### Scenario: GM initializes an unclaimed room
- **WHEN** a user with Owlbear GM UI access explicitly signs in with a durable provider and initializes a room with no Firestore workspace
- **THEN** the system atomically creates `rooms/{OBR.room.id}` with the authenticated UID as `ownerUid`

#### Scenario: Non-owner attempts configuration write
- **WHEN** an authenticated UID different from `ownerUid` attempts to modify a profile, action, setting, membership, or assignment
- **THEN** Firestore Security Rules reject the write

### Requirement: Anonymous Player Authentication
The system SHALL authenticate non-owner players anonymously without requiring account registration and SHALL treat an anonymous UID as browser-origin identity rather than durable ownership.

#### Scenario: Player opens the extension for the first time
- **WHEN** no Firebase session exists and the player is not performing owner setup
- **THEN** the extension creates or restores an anonymous Firebase session before requesting room membership

#### Scenario: Player anonymous identity is replaced
- **WHEN** a player clears browser storage and receives a new anonymous UID
- **THEN** room configuration remains owned by the GM and the player can submit a new join request for reassignment

### Requirement: GM-Approved Membership and Assignment
The system SHALL let an authenticated player create only their own join request and SHALL require the owner to approve the Firebase UID and assign a profile before profile actions become readable.

#### Scenario: Anonymous player requests access
- **WHEN** an authenticated player has no membership for the current room
- **THEN** the extension creates or updates `joinRequests/{request.auth.uid}` with an Owlbear player ID and name snapshot and shows a waiting-for-assignment state

#### Scenario: GM assigns a connected player
- **WHEN** the owner matches a join request to a player from `OBR.party.getPlayers()` and selects a profile
- **THEN** the system creates or updates `members/{uid}` with that profile assignment and the player's client receives it in real time

#### Scenario: Unapproved player requests profile data
- **WHEN** an anonymous authenticated user has no approved membership
- **THEN** Firestore Security Rules deny reads of profiles and actions

### Requirement: Profile-Scoped Member Access
An approved member SHALL read only the membership, profile, and actions authorized by their current assignment and SHALL NOT edit configuration data.

#### Scenario: Member reads assigned actions
- **WHEN** `members/{uid}.profileId` references a profile
- **THEN** that UID can read the referenced profile and its actions

#### Scenario: Member reads another profile
- **WHEN** a member requests a profile different from their assignment
- **THEN** Firestore Security Rules reject the read

### Requirement: Authorization Emulator Coverage
The project SHALL provide Firebase Emulator Suite tests proving owner, member, unapproved user, and cross-profile access behavior.

#### Scenario: Security rules are tested before deployment
- **WHEN** the authorization test suite runs against the Firestore emulator
- **THEN** it verifies owner-only configuration writes, self-owned join requests, assigned reads, cross-profile denial, and roll creation restrictions
