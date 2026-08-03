## 1. Cache Contracts

- [x] 1.1 Add an explicit cache format version to assigned-action cache schemas and invalidate unsupported legacy entries
- [x] 1.2 Define the bounded room/UID/action-scoped popover context cache schema and storage implementation
- [x] 1.3 Add cache tests for malformed JSON, schema versions, room/UID/action isolation, expiry, and storage failures

## 2. Targeted Firebase Resolution

- [x] 2.1 Add `getAction(roomId, profileId, actionId)` to the profile/action repository interface and Firestore implementation
- [x] 2.2 Add repository tests proving selected-action lookup uses one document path and does not list the actions collection
- [x] 2.3 Implement `ActionPopoverContextResolver` with assigned-cache, targeted-cache, and three-document fallback order
- [x] 2.4 Persist successful fallback context without replacing the complete assigned toolbar cache

## 3. Popover Integration

- [x] 3.1 Replace direct membership/profile/action-list loading in `action-popover/App.vue` with the cache-first resolver
- [x] 3.2 Render cached action name, icon, variables, and variants immediately after Firebase identity restoration
- [x] 3.3 Preserve explicit unavailable/error feedback, Dice+ execution, non-blocking history, and close-after-success behavior
- [x] 3.4 Add popover assertions confirming no fabricated fallback action and no full action-list query

## 4. Background Invalidation

- [x] 4.1 Clear targeted popover context when membership is removed, reassigned, denied, or invalid
- [x] 4.2 Invalidate targeted context when profile or effective action subscriptions change and refresh the versioned complete cache
- [x] 4.3 Add controller tests for revocation, reassignment, action changes, and cache-format upgrades

## 5. Read Budget and Release Verification

- [x] 5.1 Add fresh-resolver repeated-open tests proving valid cache hits make zero Firestore repository calls
- [x] 5.2 Add cold-fallback tests proving at most membership, profile, and selected-action reads and no `listActions` call
- [x] 5.3 Run unit tests and production build, then deploy a Firebase preview channel
- [ ] 5.4 Verify repeated normal, advantage, disadvantage, natural 1, and critical rolls in Owlbear while monitoring Firestore reads and popover opening behavior
- [ ] 5.5 Publish the accepted optimization to Firebase Hosting production
