# Firebase Realtime Database — teacher class creation (Kid3Pro)

**Status:** Prepared only. This GitHub file does **not** publish Firebase rules.

## Purpose
Allow active teachers to **create new classes** only for their assigned church. Keep all existing Administrator and Pastor permissions unchanged. Teachers cannot update or delete existing classes. All other Firebase paths and rules remain unchanged.

## Apply one property only

1. Back up your **current live** Firebase Realtime Database rules from the Firebase Console. Do not overwrite any newer rule changes since the rules shared in chat.
2. In **Firebase Console → Realtime Database → Rules**, locate `rules.classes.$classId[".write"]`.
3. Replace **only its `.write` expression** with the value below, preserving the surrounding JSON and every other rule.
4. Review the diff. In Rules Playground / Emulator, test with a teacher account (assigned church, other church, edit existing, delete existing), a pastor, and an admin.
5. Publish after verifying. Only then can the Kid3Pro interface create classes for teachers.

**Do not paste this fragment as the entire Realtime Database rules object.**

```json
{
  ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || (root.child('users').child(auth.uid).child('role').val() == 'pastor' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && (!data.exists() || data.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val()) && (!newData.exists() || newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val())) || (root.child('users').child(auth.uid).child('role').val() == 'teacher' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && root.child('users').child(auth.uid).child('churchId').isString() && root.child('users').child(auth.uid).child('churchId').val() != '' && !data.exists() && newData.exists() && newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val()))"
}
```

## Security notes

- Firebase permits teacher creation only if `!data.exists() && newData.exists()`; updates and deletion remain blocked.
- The new record must use exactly the user's assigned, nonempty church ID.
- Disabled or pending teachers are denied.
- Existing administrator and pastor branches are **identical** to the supplied rule.
- Database rules are shared by all old and current Kid versions: teacher create permission will apply to any client using these credentials, not only Kid3Pro.
- These rules do not change Firebase data and do not alter other rule paths.
- After publishing, test with an actual teacher account and a throwaway class. Only Admin or Pastor can delete it.

## Local expression checks

- PASS: teacher creates in assigned church
- PASS: teacher creates in different church
- PASS: teacher updates existing class
- PASS: teacher deletes existing class
- PASS: teacher disabled cannot create
- PASS: teacher pending cannot create
- PASS: teacher without assigned church denied
- PASS: pastor can create in church
- PASS: pastor can edit in church
- PASS: pastor cannot move class to other church
- PASS: pastor can delete in church
- PASS: admin can edit any church

These are expression-level simulations, not live Firebase Rules Emulator or Console tests.
