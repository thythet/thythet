# Kid3Pro — Admin Users, Google approvals and blocking

**Implemented in Kid3Pro.** This guide does not publish Firebase rules or change Firebase data.

## Admin workflow

1. A new user opens https://thythet.com/kid3pro/ and signs in with Google.
2. If the user does not have an approved `users/<uid>` record, the app attempts to create `accountRequests/<uid>` with Google name, email, provider, and pending status, then signs out.
3. An existing Admin (`admins/<adminUid>`) opens **Users → Pending**.
4. Select a request. Choose **Teacher or Pastor**, select an existing church, edit the display name if needed, and click **Approve**.
5. The app atomically writes the approved `users/<uid>` record and removes the pending request. The account signs in again using Google. There is no UID copy/paste.
6. **Reject** writes a disabled record for that UID and removes the pending request, so future Google logins are denied without a fresh request.
7. **Active** lists approved users. Admins can modify name/role/church and save, or block the account.
8. **Blocked** lists disabled, pending, or inactive user records. Admins can choose a valid role/church and reactivate them.

Only Admin accounts authorized by the separate `admins/<uid>` database structure can access the Users page; the UI does not offer management of Administrator accounts. The existing manual **Roles** page remains as a fallback.

## Firebase Realtime Database rules

**No additional rule changes are required** if your live rules still match the full rules you shared in chat:

- `accountRequests`: Admins can read/write the collection. A signed-in person may create their own pending request at `accountRequests/<auth.uid>` if it does not exist and `users/<auth.uid>` does not exist, with the required validated name/email/status/requestedAt fields.
- `users`: Admins can read/write all records; a signed-in user can read `users/<auth.uid>`.
- `admins`: The existing admin check is unchanged. Admin creation or privilege escalation is **not** included.

**Do not replace your complete rules with this document.** Confirm the *live* rules contain the accountRequests paths. If a new Google login does not appear in Pending, check browser console errors and accountRequests permissions in the Firebase Console.

## Blocking and role-change enforcement

- User records have `status:"active"` or `status:"disabled"`. Disabling a user does not disable the underlying Google/Firebase Authentication account; it blocks Kid3Pro and Firebase operations covered by the role/status database rules.
- Kid3Pro now listens to `users/<currentUid>` for non-admin accounts. On disable, removal, or role/church reassignment it signs the user out and prompts them to sign in again.
- The Firebase rules you supplied already reject disabled/pending users when accessing churches/classes/students/attendance. Some unrelated paths (e.g. settings with `.read: auth != null`) are still readable to signed-in Firebase Authentication users; true global account suspension would require an authenticated Admin SDK backend or additional narrowly scoped rule changes.
- Changing assignments during a session requires re-login. Other old Kid versions were not modified.
- Existing Admin privileges remain managed at `admins/<uid>` and cannot be granted through this Users interface.
- Approval/rejection uses Firebase UID from validated Google requests internally, *not* email as a security principal.
- Approval/rejection is a single atomic Realtime Database multi-path update.

## Tests

- JavaScript module syntax passed.
- Simulated UI tests: pending review, approval, rejection, active role/church save, blocking, reactivation, and Administrator exclusion.
- Tests verified atomic approval, rejection creating disabled records, and preservation of existing classes, Firebase configuration, and fast Summary logic.
- These tests are not live Firebase Emulator or production-account tests.

## Production smoke test

1. Login as an Admin; confirm Users appears and Roles remains available.
2. Sign in as a new Google user with no current `users/<uid>`; verify a pending request appears in Admin → Users → Pending.
3. Approve them as Teacher with church A. The user signs in again and sees church A.
4. Change the role or church; confirm the user is signed out and must sign in again.
5. Block the user; confirm they're signed out and can no longer enter Kid3Pro.
6. Reactivate with a valid church and confirm the user can sign in again.
7. Reject a new request; confirm it moves to Blocked and the user cannot request approval again unless an admin reactivates them.
8. Confirm original Admin accounts remain unaffected.

**Never place Firebase Admin SDK credentials or service account keys in GitHub Pages.**
