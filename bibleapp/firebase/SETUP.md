# Bible App — Firebase setup and security

This repository contains an account-system implementation template for **web Google sign-in**, owner/admin moderation, a Realtime Database rules example and manual cloud backups. There is no active Firebase project configuration in the repository. Offline Bible reading remains available without login.

## 1. Configure Firebase

1. Open https://console.firebase.google.com and create a Firebase project for Bible App.
2. Enable **Authentication → Sign-in method → Google**. Select a support email.
3. Under **Authentication → Settings → Authorized domains**, add thythet.com and every trusted deployment hostname. Allow localhost only for local development if necessary.
4. Create a **Realtime Database**, and copy its HTTPS URL (including region).
5. Register a Firebase **Web App**, then fill the five public Web App fields in bibleapp/web/firebase-config.js: apiKey, authDomain, databaseURL, projectId and appId. These identify the public client app and are not Admin SDK secrets.
6. Review bibleapp/firebase/database.rules.example.json, then paste/publish the security rules manually in Realtime Database → Rules. Committing a rules example does **not** deploy or change any live Firebase rules.
7. Deploy the website, visit https://thythet.com/bibleapp/web/, and select Account → Continue with Google.

If the browser returns auth/unauthorized-domain, check authorized domains and authDomain. The Firebase JavaScript SDK is pinned to 13.4.0 from www.gstatic.com and needs internet for login.

## 2. Provision yourself as the first Owner

The browser cannot assign itself administrative privileges. Sign in with Google first, then copy your **Account UID** from Bible App → Account. The new user remains Pending.

On your trusted computer ONLY, get a service-account JSON from Firebase Console → Project settings → Service accounts. **Keep this file outside your repository, app bundle, and chat.**

Install the Admin SDK dependencies under bibleapp/admin (run npm install). Set GOOGLE_APPLICATION_CREDENTIALS to the absolute path to your private service-account JSON and FIREBASE_DATABASE_URL to the exact RTDB URL. Run the following command on the trusted computer:

    cd bibleapp/admin
    npm install
    export GOOGLE_APPLICATION_CREDENTIALS="/private/path/service-account.json"
    export FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
    node bootstrap-owner.mjs YOUR_FIREBASE_AUTH_UID

On Windows PowerShell, use $env:GOOGLE_APPLICATION_CREDENTIALS="C:\private\service-account.json" and $env:FIREBASE_DATABASE_URL="https://...".

The script verifies the Google provider, then assigns the signed-in UID the secure bibleappOwner custom claim and creates an Active Owner access record. Sign out and sign back in afterward to refresh the ID token. The script is idempotent. **Never put a private Admin SDK key in a client HTML or JavaScript file.**

## 3. Owner and admin permissions

- All new Google users register as Pending. Only an Owner or existing active Admin can approve them by setting status Active.
- In Account → Manage users, find the account, choose a Member/Editor role and Pending/Active/Blocked status and save.
- **Only Owner** may grant the Admin role. Only the private bootstrap script can grant Owner.
- Users cannot change their own access record. Admin users cannot modify other admin/owner accounts. Owner records are read-only in browser.
- Database rules enforce access server-side. Own cloud study data can only be read/written by the active account itself. Administrators can see account profiles/access, not private study notes.
- Blocking removes cloud-data permission but **does not** disable Firebase Authentication or stop access to public, locally bundled Bible text. To disable/delete Auth accounts, use a trusted Admin SDK backend or separately deployed Cloud Functions.

## 4. Cloud backup safeguards

- Existing local storage keys bibleapp.study.v1 and bibleapp.prefs.v1 stay unchanged on sign-in/sign-out.
- **Upload local backup** explicitly replaces an account's cloud copy after confirmation.
- **Download cloud backup** saves a JSON file to the device.
- **Restore from cloud** explicitly replaces bookmarks, highlights and notes on this device after confirmation. Export a copy first.
- Backups are MANUAL. Automatic cross-device sync and conflict resolution are **not implemented**. Test on two devices before depending on cloud data for important notes.

## 5. Desktop and production readiness

The normal Firebase Google browser popup is not a supported secure sign-in flow inside macOS/Windows Tauri embedded WebViews. The desktop client shows an explanatory message instead. Implement **system-browser OAuth + PKCE**, with secure loopback/deep-link callback and Firebase credential exchange, before claiming native desktop Google sign-in works. Offline Bible reading remains fully available.

The following work is required before declaring public production readiness:
- Deploy real config/rules and verify Google login on the live hostname.
- Test each role, rejected privilege escalation, pending/blocked access, unauthorized REST writes, and rules in Firebase Emulator Suite.
- Add backend account deletion/disable, session revocation and support tools if required.
- Implement secure native desktop OAuth and real-device tests on Windows and macOS.
- Add privacy notice, retention/deletion policy, monitoring, abuse controls, backups, accessible error states, and code-signed/notarized installers.

This is a **secure production-oriented foundation**, not a completed, deployed Firebase service. No secrets or live security rules are changed by these repository files.


## Trusted Owner CLI for permanent account actions

Browser moderation only controls access status/roles in Realtime Database. To **disable, re-enable, or permanently delete** a Firebase Authentication identity itself, use the private Admin SDK from a trusted computer:

    cd bibleapp/admin
    npm install
    export GOOGLE_APPLICATION_CREDENTIALS="/private/path/service-account.json"
    export FIREBASE_DATABASE_URL="https://your-realtime-database-url"
    node manage-user.mjs disable USER_UID
    node manage-user.mjs enable USER_UID
    node manage-user.mjs delete USER_UID --confirm-delete

Deleting removes the Firebase Auth user, their app profile, role record and cloud study backup permanently; export the needed data first. The CLI protects owner accounts from accidental deletion/disable. Never make Admin SDK credentials accessible to the browser or include this script's private credentials in the Tauri app.
