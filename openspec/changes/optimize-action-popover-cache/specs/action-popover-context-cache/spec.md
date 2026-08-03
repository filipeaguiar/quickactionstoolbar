## ADDED Requirements

### Requirement: Cache-First Popover Context Resolution
The system SHALL resolve the selected action and profile variables from a validated assigned-action cache scoped to the current Owlbear room and authenticated Firebase UID before requesting Firestore data.

#### Scenario: Reopening after a successful roll
- **WHEN** Owlbear creates a new popover iframe and a valid assigned cache contains the selected action
- **THEN** the popover resolves its action context without membership, profile, or action document reads

#### Scenario: Cache belongs to another identity
- **WHEN** a cache entry's room ID or Firebase UID differs from the current context
- **THEN** the resolver rejects that entry and does not expose its profile, variables, or actions

### Requirement: Versioned and Validated Cache Envelopes
Assigned and targeted popover cache entries SHALL include a supported cache format version and SHALL pass Zod validation before use.

#### Scenario: Old or malformed cache is encountered
- **WHEN** an entry is unversioned, uses an unsupported version, contains invalid action data, or cannot be parsed
- **THEN** the system removes or ignores the entry and proceeds to safe fallback resolution

### Requirement: Targeted Firestore Fallback
When no valid cache contains the selected action, the resolver SHALL read only the current membership, assigned profile, and selected action document and SHALL NOT list the complete actions collection.

#### Scenario: Cold popover cache
- **WHEN** the user is assigned and opens an action absent from valid local cache
- **THEN** the resolver performs at most one membership read, one profile read, and one selected-action read

#### Scenario: Selected action no longer exists
- **WHEN** targeted fallback finds membership and profile but no selected action document
- **THEN** the popover remains open, presents an unavailable-action error, and does not execute a fallback or fabricated action

### Requirement: Dedicated Fallback Context Cache
A successful targeted fallback SHALL store a bounded selected-action context separately from the complete assigned-action cache so toolbar reconstruction never mistakes a partial action set for the full assignment.

#### Scenario: Fallback resolves one of many actions
- **WHEN** targeted fallback loads one action from a profile containing multiple actions
- **THEN** the system caches that popover context without replacing the complete assigned cache with a one-action collection

#### Scenario: Fresh popover iframe opens again
- **WHEN** a later iframe requests the same room, UID, and action within the valid fallback-cache lifetime
- **THEN** it resolves that context without repeating Firestore reads

### Requirement: Authoritative Cache Invalidation
The background synchronization flow SHALL clear targeted popover context for a room and UID after confirmed membership revocation, profile reassignment, authorization denial, invalid data, profile removal, or action-set change.

#### Scenario: GM revokes a member
- **WHEN** the background receives confirmed membership removal
- **THEN** assigned and targeted popover caches are cleared and a later popover cannot execute the former action offline

#### Scenario: Action definition changes
- **WHEN** the background receives a changed effective action set
- **THEN** stale targeted context is invalidated and the complete assigned cache is replaced with validated current data

### Requirement: Popover Read Budget Verification
Automated tests SHALL verify cache and fallback repository call counts using fresh resolver instances to model Owlbear iframe recreation.

#### Scenario: Repeated cached openings
- **WHEN** multiple fresh resolver instances open the same cached action
- **THEN** total Firestore repository calls remain zero

#### Scenario: Cold fallback opening
- **WHEN** no valid cache exists
- **THEN** tests confirm no full action-list query occurs and targeted reads do not exceed the defined three-document budget
