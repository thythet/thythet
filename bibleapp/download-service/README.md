# Bible App approval-controlled installer service

This folder contains *backend source only*, with no Firebase rules, secrets, credentials or installer binaries. The existing offline Bible remains public.

This service is **not deployed** merely by committing these files. Deploy it with Cloud Functions for Firebase (2nd gen) in the `bibleapp-software` project after confirming permissions and billing prerequisites.

- Set runtime environment variable `FIREBASE_DATABASE_URL` to the real HTTPS RTDB URL.
- Set `BIBLEAPP_PRIVATE_BUCKET` to a **private** GCS bucket, not a public website directory.
- Upload verified installers to `software/bibleapp/0.1.0/` in that bucket using the exact filenames in `index.mjs`.
- Configure an appropriately scoped runtime service account with Firebase Auth user read, RTDB read/write of required records, GCS object read, and signing permission for V4 signed URLs (for example IAM Service Account Token Creator on itself). No service account key file should be deployed.
- From `bibleapp/`, install Firebase CLI and run `firebase deploy --only functions:softwareDownload --project bibleapp-software` after configuring the runtime environment and permissions.
- Set the public `BIBLEAPP_SOFTWARE_SERVICE_URL` to the deployed HTTPS function URL in `web/firebase-config.js`. This is an endpoint URL, not a secret.
- Privately review the LIVE Firebase RTDB rules in Firebase Console. `bibleapp/softwareRequests` must be **server only**; clients must not be able to read/write it. Keep all rules outside public GitHub.

Every request includes a Firebase ID token. The server validates it and checks `bibleapp/access/<uid>` before approving requests or issuing time-limited signed URLs (120 seconds). Admins or an Owner can approve and reject requests; approved Members receive links only to explicitly whitelisted installers. Never upload these installers to GitHub Pages or a public GitHub Release if access must be controlled.

Test pending, approved, blocked and revoked users, cross-account approval attempts and expired links before inviting real users. Native desktop Google sign-in still requires separate system-browser OAuth, so this entitlement flow works on the Web until that feature is implemented.
