## Context

The extension currently stores the complete `RoomQuickActionsData` object under one Owlbear Room Metadata key. A room with one profile and two actions already uses about 13% of the shared 16 kB allowance. Saves rewrite the complete object, authorization is enforced only in the client, and there is no durable roll history. The built Vite application is hosted separately from any backend.

The desired ownership model is room-centric: the GM creates every profile and action and associates profiles with connected players; players only consume assigned actions and submit their own roll outcomes. The Owlbear SDK exposes a stable opaque `OBR.room.id` and player/party information, but it does not expose a server-verifiable Owlbear identity token that Firestore Security Rules can validate.

## Goals / Non-Goals

**Goals:**

- Remove profile and action growth from the 16 kB Room Metadata budget.
- Use `OBR.room.id` as the stable identifier for one Firebase room workspace.
- Give the GM durable ownership across browsers and devices.
- Let players enter without an account-registration screen through Firebase anonymous authentication.
- Enforce owner-only configuration writes and member/profile-scoped reads in Firestore Security Rules.
- Preserve action availability across scene changes and transient network failures.
- Store successful Dice+ outcomes as append-only, paginated history without coupling roll success to history availability.
- Migrate existing room data safely and host the complete extension on Firebase Hosting.

**Non-Goals:**

- Sharing one workspace across multiple Owlbear rooms in the initial version.
- Allowing players to edit their profiles or actions.
- Treating an Owlbear player ID, player name, or room ID as an authentication secret.
- Persisting Dice+ animation or raw broadcast envelopes indefinitely.
- Providing public roll-history analytics or cross-room campaign management.
- Guaranteeing offline edits; cached players may execute previously loaded actions, but only the online GM may author configuration.

## Decisions

1. **Use one Firestore workspace per `OBR.room.id`.** The root document path will be `rooms/{roomId}`. The room ID is an opaque locator, not a credential; Firebase Authentication and Security Rules remain mandatory. This avoids spending metadata bytes on a second identifier and matches the stated room-owned lifecycle. A separate random workspace ID was rejected because cross-room reuse is out of scope and would add linkage and recovery state.

2. **Use a durable Firebase account for the owner and anonymous auth for players.** A GM explicitly signs in with Google initially, with the provider isolated behind an auth service so another durable provider can be added later. Players sign in anonymously. Anonymous identity loss only requires renewed approval and profile association; it cannot orphan configuration because the GM owns all durable data. The UI may consult `OBR.player.getRole()` to show GM setup controls, while Firestore authorizes writes by `rooms/{roomId}.ownerUid`.

3. **Model approval as membership rather than trusting client-supplied Owlbear fields.** An anonymous player creates `joinRequests/{firebaseUid}` containing snapshots of their Owlbear player ID and name. The GM compares requests with `OBR.party.getPlayers()`, selects a profile, and creates `members/{firebaseUid}`. Rules use the authenticated UID and approved membership document; Owlbear identifiers are display and matching hints only. Members may read the room shell, their membership, assigned profile, and that profile's actions.

4. **Store data in granular documents.** The proposed structure is:

   ```text
   rooms/{roomId}
   ├── ownerUid, schemaVersion, settings, createdAt, updatedAt
   ├── profiles/{profileId}
   │   └── name, variables, metadata, timestamps
   ├── profiles/{profileId}/actions/{actionId}
   │   └── complete validated ActionDefinition
   ├── members/{uid}
   │   └── owlbearPlayerId, playerName, profileId, approvedAt
   ├── joinRequests/{uid}
   │   └── owlbearPlayerId, playerName, requestedAt
   └── rolls/{rollId}
       └── uid, profileId, action snapshot fields, outcomes, createdAt
   ```

   One action per document prevents unrelated edits from rewriting a full room and remains well below Firestore's per-document limit. Profiles retain variables because they are small and loaded together.

5. **Introduce repository boundaries and runtime validation.** UI and execution modules will depend on room/profile/action/history repository interfaces rather than importing Firestore directly. Firestore converters validate reads and writes with Zod and reject incompatible schema versions. Firebase initialization is centralized and configured from Vite environment variables; Firebase API keys are treated as public configuration, not secrets.

6. **Use realtime listeners narrowly.** The owner listens to profiles, actions needed by the manager, join requests, and members while the manager is open. A player listens to their membership and only the assigned profile/actions. Roll history is queried on demand in descending timestamp order with a page limit and cursor, never subscribed as an unbounded collection.

7. **Cache the last validated assigned profile.** Firestore's persistent local cache or an equivalent repository cache stores only validated data. On temporary network failure, a player may retain and execute the last assigned action set with a visible offline state. Assignment removal or authorization denial clears the toolbar and cache. GM writes require online acknowledgement and do not claim success from cache alone.

8. **Keep roll execution independent from history persistence.** After `executeAction` obtains correlated Dice+ step results, a history mapper stores a bounded summary using a server timestamp. A failed history write produces non-blocking diagnostics/notification and may be retried, but does not change a successful physical dice roll into a failed roll. Members may create records only for their own UID and assigned profile; records are immutable to players. Retention is controlled by a room setting and cleanup mechanism.

9. **Migrate explicitly and idempotently.** Only the signed-in owner can start migration. The migrator validates current metadata, creates/claims the room workspace, writes profiles/actions/members in batches, records a migration fingerprint, verifies reads, and only then replaces the large extension payload with a compact schema/migration marker. Re-running the same migration must not duplicate actions. The old payload is exported or retained until verification so rollback remains possible.

10. **Deploy static output through Firebase Hosting.** Hosting serves `dist`, including `manifest.json`, HTML entry points, icon assets, and hashed bundles. Hashed assets receive long immutable caching; the manifest and HTML entry points receive no-cache/revalidation headers. Preview channels validate Owlbear embedding before the production manifest URL is changed. Environment-specific Firebase project configuration is supplied at build time and no service-account secret is shipped to the browser.

11. **Test authorization against the Firebase Emulator Suite.** Unit tests continue to mock repository boundaries. Emulator tests cover Security Rules for owner, approved member, unapproved anonymous user, cross-profile access, immutable roll records, and unauthorized configuration writes. Hosting and migration receive smoke/integration checks in addition to the existing production build.

## Risks / Trade-offs

- **[The backend cannot cryptographically verify the Owlbear GM role]** → Use the first explicit durable Firebase owner as the backend authority, gate setup in the UI by Owlbear role, document the trust boundary, and provide an administrative recovery procedure. Investigate future Owlbear server-verifiable identity support before claiming stronger role proof.
- **[A malicious participant could race first-time workspace creation]** → Make initialization an explicit GM user-gesture flow, use an atomic create-if-absent operation, surface the resulting owner, and do not silently auto-create from player clients.
- **[Anonymous browser storage can be cleared]** → Keep all configuration owned by the durable GM; permit a new join request and reassignment without data loss.
- **[Firestore outage could remove action access]** → Cache the last validated assignment/actions and show offline state; never overwrite cached valid data with an incomplete snapshot.
- **[Realtime listeners can increase billed reads]** → Scope listeners by membership/profile, open broad manager listeners only while needed, and paginate history.
- **[Roll history can grow without bound]** → Store bounded summaries, paginate queries, configure retention, and avoid raw payload storage.
- **[Migration can partially write data]** → Use idempotent document IDs, batches, a fingerprint/state machine, post-write verification, and retain rollback data until completion.
- **[Changing hosting origin resets origin-scoped browser state]** → Move hosting before relying on anonymous identities, choose the production domain early, and test popup authentication inside Owlbear's iframe.
- **[Google popup authentication may be constrained by iframe/browser policies]** → Trigger sign-in from an explicit user action, configure authorized domains, test mobile browsers, and provide a top-level or redirect fallback if popup flow is blocked.

## Migration Plan

1. Create development and production Firebase projects; configure Auth providers, Firestore, indexes, rules, Hosting, and emulator files.
2. Add repository interfaces and Firebase implementations behind a feature/configuration switch while retaining the metadata repository.
3. Deploy a preview Hosting channel and validate manifest loading, iframe behavior, Auth, Firestore listeners, Dice+, and mobile browsers.
4. Add owner initialization, join approval, profile assignment, rules, and migration UI.
5. Migrate a test room, compare profiles/actions and toolbar behavior, then verify rollback with the retained metadata payload.
6. Deploy production Hosting and update the Owlbear extension manifest URL.
7. Let each existing room's GM run explicit migration. Keep the old data until Firestore verification succeeds, then reduce metadata to the compact marker if required.
8. After an observation period, remove metadata write paths and eventually retire legacy capacity UI that no longer represents configuration storage.

Rollback uses the previous Hosting release and the retained/exported Room Metadata payload. Firestore documents are additive during migration and need not be deleted to restore the old client.

## Open Questions

- Which permanent sign-in providers will be enabled besides Google, if any?
- What default roll-history retention period or maximum record count should be used?
- Should cached offline actions remain executable indefinitely or expire after a defined interval?
- Is administrative owner recovery handled manually in Firebase initially, or through an application recovery flow?
- What final Firebase Hosting project ID and custom domain will be used for the production manifest?
