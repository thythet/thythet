# Kid2Pro — Summary performance and server-side index investigation

Date: 2026-11-09

## What is implemented now

- No Firebase data or rules migration is required for the client update.
- After the authenticated `classes` and `students` listeners deliver data, JavaScript queues complete attendance preparation **per class in the selected church**.
- The last-used class is queued first. The selected class can preempt background preparation. Attendance editing pauses background requests.
- Firebase snapshots from the existing `attendance/{Sunday}/{classId}/{studentId}` schema are reused in a **per-user, in-memory session cache**. Successful class/Sunday parent reads are preferred; permission-denied parent reads fall back to existing individual paths. No new root read or elevated permission is attempted.
- Background work uses limited concurrent requests and yields to the UI.
- The Summary displays a progress/error state until all candidate Sundays for that class have been read. Once complete, names, full-period Present counts, descending ranking and all Sunday squares are shown together. There are **no partial '+' totals**.
- A class with no configured Start Date retains the previous fallback lookback (January 1 of the calendar year two years before the current year). To guarantee correct all-time totals for an older legacy class, set its actual Start Date.
- Cached totals are recalculated when this client receives an attendance change. The session cache is cleared on logout. Server-side changes outside subscribed weeks may require a new session/reload to revalidate.

## Investigation: why a materialized server index would help

The Firebase Realtime Database has no built-in automatic `COUNT(present) GROUP BY class, student` aggregation. `.indexOn` helps indexed queries, not aggregate attendance counts. Security rules are not filters: even if a user can read each individual student, reading the parent `attendance/{date}/{classId}` is denied unless parent-path rules explicitly allow it. Therefore first-visit full-history preparation can require many permitted child reads.

References:
- https://firebase.google.com/docs/database/security/core-syntax
- https://firebase.google.com/docs/database/security/indexing-data
- https://firebase.google.com/docs/database/extend-with-functions

A future **server-owned** materialized index could serve a whole class in one read. An illustrative structure is:

```text
summaryIndex/v1/{churchId}/{classId}
  schemaVersion: 1
  startSunday: YYYY-MM-DD
  endSunday: YYYY-MM-DD
  recordedWeekBits: <encoded bitset, 1 = at least one student marked Present>
  students/{studentId}
    presentCount: number
    presentWeekBits: <encoded bitset>
  rebuiltAt: server timestamp
  sourceRevision: <monotonic revision or verified consistency marker>
```

For every Sunday, the whole-class recorded flag distinguishes `No Record` (no one Present) from `Absent` (someone Present but this student is not). The student bitset gives Present. A single index read would supply counts, sorting and the compact history grid.

**Do not implement this as an unprotected client-side write.** The index must be populated/backfilled by trusted server code; kept correct on attendance writes/deletes and student/class membership or date changes; versioned and validated against original records; and read-restricted to authorized church staff. The database's deployed rules need inspection before adding the index's read permissions. Firebase Cloud Functions supports `onValueWritten()` triggers for Realtime Database.

## Migration plan (not deployed)

1. Inspect existing Firebase Rules and access model, including admin/teacher/other roles, with the Firebase Emulator Suite.
2. Design privacy-preserving read rules for `summaryIndex/v1/{churchId}/{classId}`; prohibit normal clients from writing it.
3. Backfill each class from existing attendance records using Admin SDK, taking care of archived classes and legacy missing Start Dates.
4. Deploy idempotent, region-aligned Cloud Functions or a controlled worker for writes and deletes. Ensure concurrent writes cannot lose updates and historical corrections are reflected.
5. Verify bitset status and totals against the raw records, including zero-Present Sundays and new student enrolments. Switch to index-first reads **only after** verifying completeness/freshness.
6. Keep the original attendance schema and safe client fallback. Never delete or rewrite existing student data as part of index rollout.

Current status: **proposal only**. No index has been created, no database records were changed, and no Security Rules have been modified.
