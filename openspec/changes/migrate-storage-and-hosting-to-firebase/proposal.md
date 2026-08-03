## Why

A single profile with only two actions already consumes about 13% of Owlbear Rodeo's shared 16 kB Room Metadata limit, so persisting complete profiles and action sequences there cannot scale. The extension also needs durable GM ownership, cross-device access, player assignment, and roll history that are better served by an authenticated external backend.

## What Changes

- **BREAKING** Move profiles, actions, variables, player assignments, settings, and new roll history records from Owlbear Room Metadata to Cloud Firestore.
- Use the opaque `OBR.room.id` as the stable Firestore room document identifier, avoiding large room metadata payloads.
- Make the authenticated GM the authoritative owner and only editor of room configuration, profiles, actions, and assignments.
- Authenticate the GM with a durable Firebase identity and players with low-friction anonymous Firebase identities.
- Add a join and membership flow that lets the GM associate connected Owlbear players with profiles; players can only read and execute their assigned actions.
- Persist correlated attack and damage outcomes as append-only roll history records with pagination and retention controls.
- Add local cache/loading/error behavior so temporary backend failures do not silently replace or corrupt room configuration.
- Start the Firestore workspace empty for existing rooms; provide an explicit GM-controlled export-and-discard operation for legacy metadata instead of importing old profiles, actions, or assignments.
- Deploy the Vite production bundle, manifest, pages, and static assets on Firebase Hosting with production and preview configuration.

## Capabilities

### New Capabilities
- `firebase-auth-and-membership`: Durable GM ownership, anonymous player sessions, join requests, approved membership, and profile-scoped access.
- `roll-history`: Append-only storage, retrieval, pagination, and retention of Dice+ action outcomes.
- `firebase-hosting-deployment`: Firebase Hosting configuration for the extension manifest, pages, assets, preview channels, and cache behavior.

### Modified Capabilities
- `persistence-and-security`: Replace full Room Metadata persistence and client-only role checks with Firestore storage, Firebase authorization, compact room linkage, caching, and migration.
- `data-model-and-manager`: Make the GM the only profile/action editor and move player association and manager saves to the Firebase room workspace.
- `extension-shell-ui`: Load and synchronize only the authenticated player's assigned Firestore profile and expose clear authentication, assignment, loading, and offline states.

## Impact

This change affects storage repositories, authorization, room initialization, manager workflows, background toolbar synchronization, action execution result handling, and deployment. It adds Firebase SDK dependencies and project configuration for Authentication, Firestore, Hosting, Security Rules, indexes, and optionally emulator-based tests or privileged Cloud Functions. Existing Room Metadata data will not be imported and can be exported then explicitly discarded by the GM; the extension installation URL will move to the Firebase Hosting manifest URL.
