# Kid3Pro — Firebase RTDB Class Ownership Rules

**Status:** Prepared for manual Firebase Console publication. **This GitHub document does not update the live database.**

## Changes
- Active teachers can create new classes only inside their assigned church, with `createdByUid` matching their Firebase Authentication UID.
- Active teachers can **delete only classes they personally created** in their assigned church, checked against the stored `createdByUid`.
- Teachers cannot update existing classes, delete another teacher's classes, or delete legacy classes without an owner UID.
- Admin and Pastor write permissions remain exactly as supplied.
- No other database rules, data, Firebase configuration, or older Kid folders are changed.
- `createdByEmail` is informational; **only UID controls authorization**.
- Kid3Pro checks for students assigned to a class and blocks deletion until they are reassigned. RTDB rules cannot guarantee this referential integrity atomically; teachers should not delete classes with historical dependencies.
- Teacher class deletions do not use admin-only Trash; they are permanent.

## Publish in Firebase

1. Export a backup of your live **Realtime Database → Rules** first.
2. Verify the live version still matches the previously shared rules. Do not overwrite unrelated newer changes.
3. Find `rules → classes → $classId → .write`.
4. Replace only that single `.write` string with the expression in this JSON fragment:
   
```json
{
  ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || (root.child('users').child(auth.uid).child('role').val() == 'pastor' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && (!data.exists() || data.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val()) && (!newData.exists() || newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val())) || (root.child('users').child(auth.uid).child('role').val() == 'teacher' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && root.child('users').child(auth.uid).child('churchId').isString() && root.child('users').child(auth.uid).child('churchId').val() != '' && ((!data.exists() && newData.exists() && newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val() && newData.child('createdByUid').val() == auth.uid) || (data.exists() && !newData.exists() && data.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val() && data.child('createdByUid').val() == auth.uid))))"
}
```

5. Test with the Rules Playground / Emulator using a real class owner UID and another teacher's UID, including cross-church attempts, update attempts, and deletion attempts.
6. Click **Publish**. Until published, teacher class creation/deletion may fail with `PERMISSION_DENIED`.

## Important notes
- Classes created before Kid3Pro saves `createdByUid` remain protected from teacher deletion. Admins or pastors may handle these legacy classes; do not retroactively assign ownership without verifying the original creator.
- These shared Firebase rules apply to **all Kid versions** using the same Firebase project. The updated interface applies only to Kid3Pro.
- Teacher delete actions skip Trash (admin-only). Admin deletion retains its existing Trash workflow.
- The new rule checks authentication and UID on Firebase's server. Hiding buttons alone does not grant or secure permissions.
- This patch does **not** implement the proposed new Admin Users page. Existing `accountRequests`, `users`, and `admins` permissions remain unchanged.

## Expression-level permission tests

- PASS: teacher create own church — allowed
- PASS: teacher create wrong church — denied
- PASS: teacher create with different owner — denied
- PASS: teacher update own class — denied
- PASS: teacher delete own class — allowed
- PASS: teacher delete other teacher's class — denied
- PASS: teacher delete same UID in another church — denied
- PASS: teacher delete legacy unowned class — denied
- PASS: teacher delete class when no church — denied
- PASS: pastor create — allowed
- PASS: pastor edit — allowed
- PASS: pastor delete — allowed
- PASS: pastor other church update denied — denied
- PASS: admin create — allowed
- PASS: admin edit — allowed
- PASS: admin delete — allowed
- PASS: teacher blocked disabled — denied
- PASS: teacher blocked pending — denied

These are local expression tests, not live Firebase Rules Emulator tests.
