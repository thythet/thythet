# Kid3Pro — Firebase Realtime Database Class Ownership Rules

**Prepared, not published.** This file does not deploy Firebase rules. Only the GitHub application code has been updated.

## Permission design

- **Admin:** Existing create, update, and delete permissions unchanged.
- **Pastor:** Existing class create, update, and delete permissions for their assigned church unchanged.
- **Active Teacher:** Create classes in their assigned church, including a `createdByUid` matching the authenticated Firebase UID. Fully edit **their own** class name, start/end dates, and Active/Archived status. Delete **their own** class. Cannot edit/delete classes created by other teachers.
- **Ownership and church:** An editing teacher cannot change `churchId`, `createdByUid`, `createdByEmail`, or `createdAt`. The authenticated owner is checked using `auth.uid` against existing data.
- **Legacy classes:** Classes without a valid creator UID cannot be edited or deleted by teachers. Admin/Pastor management is unaffected.
- **Deletion safety:** The Kid3Pro UI prevents deleting a class while students are assigned to it, but database rules cannot enforce that student-class relationship without a changed data model. Old attendance records are not automatically deleted. Teacher deletions bypass admin-only Trash and are permanent.

## One-property Firebase change

Back up your live rules at **Firebase Console → Realtime Database → Rules**.

Compare the live rules to your existing backup. Replace **only** `rules.classes.$classId[".write"]` with the expression below. Preserve every other permission and your full original JSON document.

```json
{
  ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || (root.child('users').child(auth.uid).child('role').val() == 'pastor' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && (!data.exists() || data.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val()) && (!newData.exists() || newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val())) || (root.child('users').child(auth.uid).child('role').val() == 'teacher' && root.child('users').child(auth.uid).child('status').val() != 'disabled' && root.child('users').child(auth.uid).child('status').val() != 'pending' && root.child('users').child(auth.uid).child('churchId').isString() && root.child('users').child(auth.uid).child('churchId').val() != '' && (( !data.exists() && newData.exists() && newData.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val() && newData.child('createdByUid').val() == auth.uid ) || ( data.exists() && data.child('churchId').val() == root.child('users').child(auth.uid).child('churchId').val() && data.child('createdByUid').val() == auth.uid && (!newData.exists() || ( newData.child('churchId').val() == data.child('churchId').val() && newData.child('createdByUid').val() == data.child('createdByUid').val() && newData.child('createdByEmail').val() == data.child('createdByEmail').val() && newData.child('createdAt').val() == data.child('createdAt').val() ))))))"
}
```

**Do not paste this fragment as the entire rules document.**

## Important publication and compatibility notes

1. Test Rules Playground / Emulator before publishing; this prepared expression was locally simulated, not executed against your live Firebase instance.
2. Publish the new rule from the Firebase Console only after verifying with authenticated example UIDs for Admin, Pastor, owning Teacher, non-owning Teacher, disabled/pending Teacher, and two different churches.
3. The Firebase rules are **shared across all Kid versions** in this Firebase project. The newest Kid3Pro UI is owner-aware; older Kid versions were not changed.
4. Teacher updates that attempt to replace creator metadata or move a class across churches are denied even if a modified client sends the request.
5. Do not apply this file against newer or different live rules without first reconciling those changes. This exact patch derives from the full ruleset supplied in the conversation.

## Local validation performed

- Full generated JSON parsed successfully.
- The revised JSON differs from the previously prepared full ruleset **only** at `/rules/classes/$classId/.write`.
- 25 simulated authorization tests passed, including owner edits/deletes, cross-church denial, immutable owner fields, disabled/pending teachers, and unchanged Admin/Pastor access.
- These do not substitute for Firebase Rules Emulator tests.

## Related changes

The Kid3Pro Class page now shows compact, independently collapsible church groups and owner-specific class actions. Home → Copy This Week has a class dropdown (All Classes by default). No attendance records, Firebase data, Cloudinary data, or other Kid folders were modified.
