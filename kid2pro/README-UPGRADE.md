# Love Kid — Option B staged safe upgrade (v1)

## What is implemented
- Existing attendance pages and records remain in their original Firebase project and original database paths.
- Firebase Google sign-in buttons on attendance + dashboard (enable Google provider and add GitHub Pages authorized domain).
- New Google users submit `/accountRequests/{uid}` for approval **only if the supplied rule snippet is merged and published**. Accounts do NOT automatically gain roles.
- Existing user roles remain unchanged; disabled/pending statuses are denied in the attendance frontend.
- Full original thechat v2.1.63 lives at `chat/`, linked from attendance and dashboard.
- Love Kid PWA manifest, icons and offline app-shell cache; thechat retains its own PWA files.
- Student photo file picker and Firebase Storage upload implementation. **Uploads are intentionally denied until a secure backend and storage rules are configured.** The existing filename/photo URL field remains operational.

## BEFORE deployment (critical)
1. Export full backups of *both* Firebase Realtime Databases, Auth users/UID map (admin export), existing Storage objects, and current GitHub files.
2. Deploy to a NEW staging path/site first, and test with sample accounts; this archive does not touch remote data.
3. Enable Google in Firebase Authentication for `sunday-school-system-7f1f8`; add your `thythet.com` domain and GitHub Pages domain as authorized domains where needed.
4. Merge `account-requests-rules-addition.json` as **one child under existing root rules**; do not replace current rules with that snippet. Admin must approve request by writing `/users/{uid}` with authorized role/churchId. Any `accountRequests` write requires the snippet.
5. Cloudinary has not been configured; no Cloudinary secret/preset is bundled.
6. **Do not deploy `storage.rules` as a working upload solution**. It denies everything intentionally. The student upload UI is staging-only until a trusted Cloud Function/backend validates Firebase ID tokens and church permissions and grants secure file access. Firebase Storage rules cannot natively read Realtime Database roles. The generated Storage download URL is a bearer URL and not suitable for confidential student photos; use short-lived authorized serving URLs instead.
7. thechat uses Firebase project `thechat-a79b9`, separately from Love Kid `sunday-school-system-7f1f8`. This build retains thechat's own sign-in and existing records. **Unified account SSO and data migration are NOT implemented**. A secure server-issued custom token/account-link mechanism and access control changes are needed; never link by email alone.
8. No migrations or live Firebase rule changes occurred. Test attendance and chat separately before publishing.

## Why this staged architecture?
Existing Auth user IDs across distinct Firebase projects cannot be assumed equal. Forcing clients into one project could orphan messages or break rules. This archive adds the first non-destructive integration without falsely claiming complete SSO or secure child-photo upload.
