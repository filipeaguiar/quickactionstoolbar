# Firebase deployment

## Public browser configuration

Copy `.env.example` to `.env.local` and populate it only with the Firebase Web App configuration. Firebase Web API keys identify the project and are not authorization secrets; Firestore Security Rules protect data.

Never place service-account JSON, private keys, refresh tokens, or Admin SDK credentials in `VITE_*` variables. `.env.local` is ignored by Git.

## Local verification

Use a supported Node.js release (22 or 24) and Java for the Firestore emulator.

```bash
npm test
env -u NODE_TLS_REJECT_UNAUTHORIZED npm run test:rules
npm run build
env -u NODE_TLS_REJECT_UNAUTHORIZED npm run firebase:emulators
```

The emulator build can use a separate `.env.development.local` with `VITE_FIREBASE_USE_EMULATORS=true`.

## Preview channel

```bash
env -u NODE_TLS_REJECT_UNAUTHORIZED npm run deploy:preview
```

The command builds `dist` and creates a seven-day Hosting preview channel. Install the preview `manifest.json` URL in an Owlbear test room and verify:

- manager and background iframe loading;
- Google owner sign-in and anonymous player auth;
- join approval and assignment;
- Firestore synchronization and Security Rules;
- Dice+ normal, advantage, disadvantage, natural 1, and critical flows;
- desktop and mobile layout;
- absolute native toolbar icon URLs.

## Production

```bash
env -u NODE_TLS_REJECT_UNAUTHORIZED npm run deploy:production
```

The `production` alias currently points to `quickactionsbar`. The deployment publishes Hosting, Firestore Rules, and indexes. Update the Owlbear extension installation only after preview acceptance:

```text
https://quickactionsbar.web.app/manifest.json
```

## Cache behavior

- `manifest.json` and HTML entry points: revalidate every request;
- `/assets/**`: one year and immutable because Vite filenames are hashed;
- `/icons/**`: short cache with revalidation because icon paths are stable.

## Rollback and owner recovery

Firebase Hosting keeps release history for rollback. Legacy Owlbear data must be exported before explicit discard. Initial owner recovery is administrative: verify the GM and update the room document owner only through the Firebase Console or a trusted administrative environment; never ship Admin SDK credentials to the extension.
