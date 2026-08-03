## Why

The Owlbear popover iframe is destroyed after each successful roll and mounted again on the next click, which is expected for `OBR.popover.close()` but currently causes repeated Firebase membership, profile, and full action-collection reads before rendering. The background already maintains a validated assigned-action cache, so the popover can become immediate and substantially reduce billed reads without changing its visible close-after-roll behavior.

## What Changes

- Resolve the current profile variables and selected action from the background-maintained assigned-action cache before making Firestore requests.
- Add a versioned, room-and-UID-scoped popover context lookup that rejects malformed, mismatched, revoked, or obsolete cache entries.
- Render the attack name and variant buttons as soon as valid cached context is available, while preserving the existing fresh Vue mount and transparent toolbar appearance.
- Add a targeted Firestore fallback that reads only membership, assigned profile, and the selected action document when cache is absent or invalid, instead of listing every action in the profile.
- Refresh the shared cache after a successful fallback so subsequent popover openings remain cache-only.
- Preserve cache invalidation on membership revocation, profile reassignment, authorization denial, invalid data, and action/profile changes from the background subscriptions.
- Keep closing and destroying the Owlbear popover after a successful roll; this change optimizes context restoration rather than attempting unsupported iframe hiding.
- Add tests and read-count assertions for cache hits, fallback, stale entries, isolation, revocation, and repeated openings.

## Capabilities

### New Capabilities
- `action-popover-context-cache`: Versioned cache-first resolution of the selected action and variables, with targeted Firestore fallback, isolation, validation, and invalidation behavior.

### Modified Capabilities
- `extension-shell-ui`: Make repeated action-popover openings render from cached assigned context without full-profile Firestore reads while retaining the existing close-after-success lifecycle.

## Impact

This change affects `AssignedActionCache`, the Firebase profile/action repository, background cache synchronization, `src/ui/action-popover/App.vue`, and related tests. It depends on the Firebase-backed room/member/profile model introduced by `migrate-storage-and-hosting-to-firebase` and does not alter persisted action definitions, Dice+ protocol behavior, critical rules, or Firebase Hosting configuration.
