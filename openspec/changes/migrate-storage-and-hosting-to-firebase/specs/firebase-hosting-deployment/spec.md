## ADDED Requirements

### Requirement: Firebase-Hosted Extension Bundle
The project SHALL deploy the Vite `dist` output to Firebase Hosting, including the Owlbear manifest, all HTML entry points, hashed JavaScript and CSS bundles, fonts, and standalone icon assets.

#### Scenario: Owlbear installs the production extension
- **WHEN** Owlbear loads `https://<production-host>/manifest.json`
- **THEN** every relative manifest URL, page entry point, and static asset resolves successfully over HTTPS

### Requirement: Safe Hosting Cache Policy
Firebase Hosting SHALL serve hashed assets with long-lived immutable caching and SHALL serve `manifest.json` and HTML entry points with revalidation or no-cache behavior.

#### Scenario: A new release is deployed
- **WHEN** the production manifest and entry points are requested after deployment
- **THEN** clients discover the new hashed bundles instead of remaining pinned to stale HTML or manifest content

### Requirement: Environment-Separated Firebase Configuration
The build SHALL support distinct development, preview, and production Firebase configuration without embedding service-account credentials or other server secrets in browser assets.

#### Scenario: Production bundle is inspected
- **WHEN** built browser assets are reviewed
- **THEN** they contain only public Firebase web configuration and no administrative private key or service-account credential

### Requirement: Preview Validation Before Production
The deployment workflow SHALL support Firebase Hosting preview channels and SHALL require validation of Owlbear embedding, authentication, Firestore access, Dice+ integration, and mobile layout before changing the production manifest deployment.

#### Scenario: Candidate release is prepared
- **WHEN** a release candidate is deployed
- **THEN** it receives a preview URL that can be tested before production deployment
