# Bible App — software downloads for signed-in users

The public Bible App allows **all Google-signed-in users** (Pending, Active, or Blocked cloud status) to view the desktop installer list and download available files. No Admin approval or Realtime Database access role is required for software downloads. Private cloud-study access approval remains separate.

This Cloud Functions backend is **not deployed** by committing source code. Until you deploy it and upload verified installers, the web popup displays a setup message, not working download links.

1. Configure Cloud Functions for Firebase 2nd gen in project `bibleapp-software`, region `asia-southeast1`, and meet any billing requirements.
2. Set `BIBLEAPP_PRIVATE_BUCKET` in the function runtime environment to a **private** Google Cloud Storage bucket, with public access disabled. No RTDB rules need to be changed for this function.
3. Upload verified Windows EXE/MSI and macOS Apple Silicon/Intel DMG files under `software/bibleapp/0.1.0/` with the exact filenames listed in `index.mjs`.
4. Grant the function runtime service account appropriate Firebase Auth and GCS read/signing permissions, including V4 signed URL signing ability. Never commit or share service-account private keys.
5. Deploy with Firebase CLI from `bibleapp/`: `firebase deploy --only functions:softwareDownload --project bibleapp-software`.
6. Set `window.BIBLEAPP_SOFTWARE_SERVICE_URL` in `web/firebase-config.js` to the deployed function's HTTPS endpoint URL; then redeploy GitHub Pages.
7. Test signed-out, Pending, Active, Blocked, and revoked/disabled Firebase Auth identities, invalid file IDs, missing installers, and 120-second link expiration.

Every request carries a Firebase ID token. The backend verifies it (including token revocation), then returns only approved-file IDs and time-limited signed URLs. Do not upload the protected installers to a public GitHub Release or GitHub Pages if Google sign-in is required.

**Never commit Firebase database rules or private keys to GitHub.** This download change does not alter live Firebase rules, user accounts, or the existing offline Bible reader. Native desktop Google Login still requires separate OAuth development.
