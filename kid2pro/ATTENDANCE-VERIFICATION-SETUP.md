# Love Kid Pro — Firebase attendance verification setup

The `kid2pro/` attendance screen now supports the **បានពិនិត្យ / Verified** button. Verification is scoped to one class and one Sunday and is independent of the student attendance values.

## Database structure

The browser reads `attendanceVerification/{classId}` and writes only `attendanceVerification/{classId}/{YYYY-MM-DD}` when an authorized user confirms or reopens the selected date. A sample record is:

```json
{
  "verified": true,
  "churchId": "the-class-church-id",
  "updatedAt": 1794099600000,
  "updatedBy": "firebase-auth-uid",
  "updatedByName": "Teacher",
  "verifiedAt": 1794099600000
}
```

The date and timestamp in this example are illustrative. Unchecking the verification button writes `verified: false` and `verifiedAt: null`, **not** an attendance data migration. Existing `attendance/{date}/{classId}/{studentId}` values remain intact; when a present checkbox is unchecked, the individual student mark is now deleted (`null`), so it is No Record before verification and Absent after verification.

## Required Firebase Realtime Database rules

The current production RTDB rules were **not available for inspection**, so they have **not been modified or deployed** by this GitHub update. If the UI reports `permission_denied`, authorized administrators must **merge a new rule for the attendanceVerification subtree into the existing RTDB rules** in Firebase Console → Realtime Database → Rules.

The rules must grant:

- **Read** of `attendanceVerification/{classId}` only to signed-in users authorized to view that class and its church.
- **Write** of `attendanceVerification/{classId}/{date}` only to active admin, pastor, or teacher accounts authorized for that class's church.
- Validate the `verified` boolean, the church ID against `classes/{classId}/churchId`, the `updatedBy` UID against `auth.uid`, and valid timestamp/date fields.
- Avoid granting public read/write or granting broad access to all students or all churches. Preserve all existing rule branches, particularly `admins`, `users`, `classes`, `students`, `attendance`, `activities`, and `settings`.

**Do not replace your entire rules JSON with a single example subtree.** Review your current role and church access checks and extend those checks to the new subtree. The frontend role check is a convenience, not a security boundary; Firebase server-side rules must enforce authorization.

## Testing checklist

1. With an authorized teacher account, select a church, class and Sunday.
2. Mark two students Present. Before verification, all unchecked students should be No Record, not Absent.
3. Verify the date. Confirm that unchecked students now display a red × beside their empty checkbox and count as Absent.
4. Check an absent student: the red × disappears immediately. Uncheck them: the red × returns.
5. In Summary, check green ✓, red × and neutral squares for the same date.
6. Reopen verification. Unchecked students return to No Record; the individual Present records remain.
7. Reload the page and verify the status persists. Test both a teacher in the correct church and a teacher in a different church (access must be denied).
8. Confirm existing `kid2/` and its historical records are unchanged.

The GitHub update alone does **not** deploy Firebase rules or create attendance verification records automatically.
