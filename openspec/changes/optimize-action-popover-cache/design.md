## Context

Owlbear implements each anchored popover as an iframe. The action popover calls `OBR.popover.close()` after a successful roll, so Owlbear destroys that iframe; the next click necessarily loads `action-popover.html` and mounts a new Vue application. The SDK exposes `open` and `close`, but no hide/suspend operation that preserves iframe memory.

The Firebase migration introduced a background controller that keeps the assigned profile and complete action set synchronized and writes a validated `AssignedActionCache` in same-origin browser storage. Despite that, every new popover currently waits for Firebase Auth, reads membership, reads the profile, and lists the entire actions subcollection before finding one action. Repeated rolls therefore redraw after asynchronous work and can produce document reads proportional to the number of profile actions.

## Goals / Non-Goals

**Goals:**

- Render a newly mounted variant toolbar immediately from validated same-origin cache when possible.
- Perform zero Firestore document reads on the normal cache-hit path.
- Bound the fallback to membership, one profile, and one selected action document.
- Keep cache data isolated by room and authenticated Firebase UID.
- Preserve revocation, reassignment, authorization-denial, schema-validation, and action-change invalidation.
- Preserve the current transparent toolbar, automatic close after success, Dice+ flow, and roll history behavior.

**Non-Goals:**

- Preventing Owlbear from destroying a closed popover iframe.
- Keeping the variants visible after a successful roll.
- Adding SSR or Vue hydration.
- Making cache content an authorization source; Firestore Security Rules remain authoritative.
- Changing action definitions, critical calculations, history records, or native ToolAction lifecycle.

## Decisions

1. **Accept iframe recreation and optimize restoration.** The popover will still call `OBR.popover.close()` after success. A fresh `createApp(App).mount()` is expected on the next click. Attempting to preserve a hidden iframe was rejected because `PopoverApi` has no hide operation and because leaving it open changes requested UX.

2. **Introduce a cache-first context resolver outside the Vue component.** `ActionPopoverContextResolver` will receive `roomId`, authenticated `uid`, and `actionId`, then return `{ profileId, variables, action, source }`. The component only maps resolver states to loading/error/UI, making behavior unit-testable without mounting Owlbear or Firebase.

3. **Use the complete assigned cache as the primary source.** The resolver first loads `AssignedActionCache` using the exact room and UID, validates its version/schema, and finds the requested action. A valid hit returns synchronously without membership, profile, or action reads. Cache keys and embedded IDs must both match; data for another room, UID, or profile is rejected.

4. **Version cache envelopes.** Add an explicit cache format version. Existing unversioned or unsupported entries are invalidated rather than guessed. This is a local format migration only; it does not affect Firestore documents.

5. **Add a dedicated bounded fallback-context cache.** A targeted Firestore fallback cannot overwrite the complete assigned cache with only one action, because that would remove toolbar actions on a later offline load. Instead, fallback results are saved in a small `ActionPopoverContextCache` keyed by room, UID, and action ID, with schema version, profile ID, variables, selected action, and timestamp. Resolution order is complete assigned cache, valid fallback-context cache, then Firestore.

6. **Bound fallback reads.** Add `ProfileActionRepository.getAction(roomId, profileId, actionId)`. On cache miss, the resolver performs at most: `getMember`, `getProfile`, and `getAction`. It never calls `listActions`. If membership/profile/action is absent, the resolver clears relevant popover cache and returns an explicit unavailable result.

7. **Let the background own invalidation.** Background subscription updates continue to replace the complete assigned cache. On membership removal, reassignment, permission denial, invalid schema, profile removal, or action-set change, the controller clears the fallback-context cache for that room/UID. This prevents an old targeted entry from surviving authoritative synchronization.

8. **Use cache only after Firebase identity restoration.** The popover still waits for Firebase Auth initial state so it can select the room-and-UID key. This local auth restoration does not itself incur Firestore reads. It must not search all cache keys or infer identity from Owlbear player fields.

9. **Keep fallback errors visible but cache hits quiet.** A valid cache hit opens normally. If cache is absent and Firestore fallback fails, the popover stays open and shows the existing actionable error behavior. Offline use may continue from the validated complete assigned cache.

10. **Measure behavior with repository spies.** Tests will assert zero repository calls on assigned-cache hits, at most three targeted gets on cold fallback, no `listActions`, cache refresh after fallback, and clearing after revocation or mismatch. A repeated-open test creates fresh resolver instances against the same storage to model iframe destruction.

## Risks / Trade-offs

- **[Cached action may briefly lag a Firestore update]** → Background realtime subscriptions replace/invalidate cache; fallback cache is cleared on action-set updates and uses a bounded lifetime.
- **[Anonymous UID changes]** → Room-and-UID keys prevent reuse; the player returns to approval flow under the new UID.
- **[Fallback cache could conflict with full cache]** → The full assigned cache always has priority and fallback data lives in a separate envelope that never feeds toolbar reconstruction.
- **[Browser storage unavailable or corrupted]** → Catch storage errors, invalidate malformed entries, and use targeted Firestore fallback.
- **[Auth initialization still contributes latency]** → Keep Firebase Auth persistence enabled; avoid Firestore during valid cache resolution. Removing Auth from the trust boundary was rejected.
- **[Popover bundle remains large]** → Bundle splitting is separate work; this change focuses on repeated reads and context latency.

## Migration Plan

1. Version `AssignedActionCache`; existing local entries fail closed and are repopulated by background subscriptions.
2. Add the targeted action repository method and dedicated popover context cache/resolver.
3. Switch `App.vue` from direct membership/profile/list reads to the resolver.
4. Add background invalidation hooks and read-count tests.
5. Deploy to a Firebase preview channel, compare Firestore reads and visual opening behavior across repeated rolls, then publish production.

Rollback restores direct targeted Firestore resolution; no server data migration is involved.
