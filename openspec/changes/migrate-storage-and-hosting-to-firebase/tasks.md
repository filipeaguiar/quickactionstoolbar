## 1. Firebase Project and Local Tooling

- [x] 1.1 Add Firebase web SDK and Firebase CLI/emulator development dependencies and scripts
- [x] 1.2 Add typed Vite environment configuration with an example file and startup validation that exposes no server credentials
- [ ] 1.3 Add `firebase.json`, Firestore rules, index configuration, emulator configuration, and project aliases for development and production
- [ ] 1.4 Configure the selected durable GM sign-in provider and anonymous player authentication in the Firebase projects

## 2. Firestore Data Model and Repository Boundary

- [ ] 2.1 Define Zod schemas and TypeScript types for room workspaces, profiles, actions, memberships, join requests, migrations, and roll summaries
- [ ] 2.2 Define repository interfaces for workspace ownership, profiles/actions, memberships, migration, and roll history
- [ ] 2.3 Centralize Firebase app, Auth, Firestore, timestamp, and persistent-cache initialization
- [ ] 2.4 Implement validated Firestore converters and room/profile/action repositories using `OBR.room.id` as the room document ID
- [ ] 2.5 Add repository unit tests for validation, unsupported schema versions, deterministic paths, and error mapping

## 3. Authentication and Ownership

- [ ] 3.1 Implement Firebase session state with anonymous sign-in for players and explicit durable sign-in/sign-out for GM ownership
- [ ] 3.2 Implement explicit atomic workspace initialization guarded in the UI by the Owlbear GM role and owned by the durable Firebase UID
- [ ] 3.3 Implement self-owned join-request creation using Owlbear player ID/name snapshots
- [ ] 3.4 Implement owner approval, membership assignment, reassignment, and revocation repositories
- [ ] 3.5 Add authentication and ownership state tests, including anonymous identity replacement and existing-owner handling

## 4. Firestore Authorization

- [ ] 4.1 Implement Security Rules for owner-only workspace, profile, action, membership, and assignment writes
- [ ] 4.2 Implement Security Rules for self-owned join requests and profile-scoped member reads
- [ ] 4.3 Implement Security Rules for member-created, self-attributed, assigned-profile roll records and immutable player history
- [ ] 4.4 Add Firebase Emulator tests covering owner, approved member, unapproved user, cross-profile access, spoofed writes, and roll immutability

## 5. Legacy Metadata Migration

- [ ] 5.1 Implement detection and validation of legacy `RoomQuickActionsData` without automatically deleting or rewriting it
- [ ] 5.2 Implement deterministic, batched, idempotent migration of settings, profiles, actions, and assignments with migration fingerprint/state
- [ ] 5.3 Verify migrated Firestore reads before replacing the large metadata payload with a compact migration/schema marker
- [ ] 5.4 Add migration retry, partial-failure, duplicate-prevention, export/rollback, and capacity-safety tests

## 6. GM Manager Experience

- [ ] 6.1 Add owner sign-in, workspace initialization, migration progress, backend error, and synchronization states to the manager
- [ ] 6.2 Replace metadata profile/action/variable saves with validated Firestore repositories and owner-only controls
- [ ] 6.3 Add pending join requests alongside `OBR.party.getPlayers()` with approval and profile assignment controls
- [ ] 6.4 Add membership reassignment and revocation controls with confirmation and clear status feedback
- [ ] 6.5 Make the manager read-only for non-owners and show their sign-in, approval, assignment, offline, or denied state
- [ ] 6.6 Update manager component and authorization tests for the GM-only editing model

## 7. Player Toolbar Synchronization and Cache

- [ ] 7.1 Replace Room Metadata listeners with auth, membership, assigned-profile, and assigned-action Firestore subscriptions
- [ ] 7.2 Scope player listeners to the current UID and assigned profile and preserve ToolActions when effective data is unchanged
- [ ] 7.3 Implement validated persistent caching of the last assigned profile/actions with a visible offline-cache state
- [ ] 7.4 Clear ToolActions and cached assignment after confirmed revocation, reassignment, validation failure, or authorization denial
- [ ] 7.5 Add tests for waiting, assigned, changed, revoked, offline, reconnect, and denied toolbar states

## 8. Roll History

- [ ] 8.1 Define a bounded history mapper from completed action execution and correlated Dice+ results, including mode, natural outcome, critical/miss, and damage summaries
- [ ] 8.2 Implement append-only roll creation with server timestamps and non-blocking failure/retry diagnostics
- [ ] 8.3 Add owner history queries with newest-first page limits and cursor pagination
- [ ] 8.4 Implement the selected room retention setting and authorized cleanup mechanism
- [ ] 8.5 Add tests proving successful roll independence from history failure, schema validation, ownership, pagination, and retention

## 9. Firebase Hosting

- [ ] 9.1 Configure Firebase Hosting to publish `dist` and serve the manifest, HTML entry points, icons, fonts, and hashed bundles
- [ ] 9.2 Configure revalidation/no-cache headers for manifest and HTML and immutable caching for hashed assets
- [ ] 9.3 Add preview and production deploy scripts/documentation with environment-specific Firebase configuration
- [ ] 9.4 Deploy a preview channel and verify all manifest URLs and absolute native toolbar icon URLs resolve inside Owlbear
- [ ] 9.5 Update the production Owlbear extension installation to the finalized Firebase Hosting manifest URL after acceptance

## 10. End-to-End Verification and Rollout

- [ ] 10.1 Run unit, component, Firestore Emulator, production build, and hosting smoke tests
- [ ] 10.2 Verify GM durable sign-in and ownership on desktop and mobile, including sign-out and session restoration
- [ ] 10.3 Verify anonymous player join, approval, profile assignment, action execution, revocation, and renewed UID reassignment
- [ ] 10.4 Verify normal, advantage, disadvantage, natural 1, automatic critical damage, and non-blocking history failure with Dice+
- [ ] 10.5 Verify migration and rollback in a representative existing room and confirm Room Metadata remains nearly constant as actions are added
- [ ] 10.6 Verify offline cached execution, reconnection, listener read scope, history pagination, and mobile Owlbear behavior
- [ ] 10.7 Deploy production Hosting, monitor Auth/Firestore errors and usage, and document owner recovery and rollback procedures
