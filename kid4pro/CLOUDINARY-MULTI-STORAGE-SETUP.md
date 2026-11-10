# Kid4Pro — Cloudinary Multi-Storage Setup

Kid4Pro supports multiple user-owned Cloudinary storage configurations and Admin sharing with approved Teachers and Pastors. This change is scoped to `kid4pro/`. The older versions retain their existing `settings/cloudinary` configuration and behavior.

## Firebase setup (manual approval required)

**Do not store or publish the complete Realtime Database rules in this public repository.** Keep the complete rules privately and manage them only in Firebase Console. The three new permission paths required for this feature are described below; merge them into your privately held current rules, test, and publish through Firebase Console.

**These rules are NOT live until an authorized administrator explicitly publishes them in Firebase Console.** Back up your currently published rules, merge the three new Cloudinary paths into your existing private JSON, and test in the Firebase Emulator before publishing. Do not replace or weaken the existing sections.

New paths:

- `cloudinaryAccounts/$ownerUid/$storageId` — each approved user owns and edits only their own Cloudinary public configuration.
- `cloudinaryDefaults/$uid/key` — each approved user saves a selected default storage across devices.
- `cloudinaryShared/$recipientUid/$ownerUid/$storageId` — only Firebase Admin can grant and revoke access to configurations owned by an Admin.

Shared storage is fetched one record at a time from `cloudinaryAccounts/$ownerUid/$storageId`, not by reading an entire owner's collection. Firebase rules are not query filters.

## Setup and use

1. In Cloudinary, create an **unsigned image-only** upload preset with strict format and file-size limits and a controlled folder.
2. In Kid4Pro, sign in as an approved Admin, Teacher, or Pastor.
3. Open the new **Storage** tab → **My Cloudinary Storage** → **Add Cloudinary Storage**.
4. Enter a storage label, Cloud Name, unsigned upload preset, and optionally a folder. Fields marked * are required; Cloud Name and preset must match Cloudinary. Read the short security note and choose **Save Storage**. The browser records the existing acknowledgement timestamp when saved, without an extra checkbox.
5. Open the **Student** tab and tap **Upload Photo**. When personal or shared storage is available, a Select-Class-style dropdown lists all permitted destinations (including legacy storage, if configured). Choose a destination to open the native photo picker. With legacy storage only, the photo picker opens immediately. With no configured storage, the app opens the Storage page and prompts for setup. For a default storage across devices, choose **Use** on the Storage page.
6. For Admin: choose **Share** next to an Admin-owned storage, select approved Teachers or Pastors, and select **Save Sharing**. Recipients see the shared storage as read-only.

The old `settings/cloudinary` is still displayed as **School Storage (legacy)** if configured. It is read-only in Kid4Pro; older Kid versions continue using it.

## Security and compatibility

- Never place Cloudinary API keys or API secrets in a browser or Firebase public configuration.
- Firebase rules limit who can read/edit shared **configuration data**, not who can call Cloudinary's unsigned upload API. Anyone who learns the preset may be able to upload unless Cloudinary/your backend enforces additional protections. Use signed uploads through a secure backend for strong per-user Cloudinary enforcement.
- Uploads continue to save the returned secure image URL as the student's photo; no existing student or attendance data is migrated.
- Deleting a storage entry does **not** delete previously uploaded images.
- Revoking a Firebase share removes future access to the Firebase configuration, but cannot revoke a preset value already known to a user.
- Changing the same Firebase project's live rules affects all applications using that database. Existing rule blocks were preserved in the prepared file, but test old Kid2Pro/Kid3Pro reads/writes and account permissions before and after publishing.

## Student photo picker behavior

- The Student form does not display a permanent Cloudinary storage dropdown or storage settings panel.
- The Storage tab contains the complete personal-storage list, Add/Edit/Delete actions, default selection, and Admin sharing controls.
- Upload Photo opens a compact glass option list only when a personal or shared storage is configured. Choosing a listed storage launches the device file picker directly.
- No personal/shared storage + configured legacy account uses the existing legacy account without an extra choice.
- No usable storage shows a notice and opens the Storage tab. A revoked storage cannot be used to upload.
- The selected storage is per upload; selecting it does not silently change a saved default. The **Use** action on the Storage page still saves the default in Firebase.

## Manual smoke/regression tests

- Admin creates two storages, chooses one, refreshes and signs in on another device — selected default syncs.
- Teacher creates and edits their own storages; cannot modify Admin's shared storage.
- Admin shares one of their storage entries with Teacher A, not Teacher B — A can read and select it; B cannot read it.
- Admin revokes A — it disappears from A's list after sync. Blocked/pending users cannot read new paths.
- Verify valid JPEG/PNG/WebP uploads under 5 MB on each selected storage. Confirm returned URL remains stored on Student Save.
- Verify wrong or missing rules show a clear permission error rather than silently saving locally.
- Verify Kid3Pro still reads `settings/cloudinary`, saves students, checks attendance, and uses its previous upload configuration.

**Status:** Prepared for review; no Firebase rules were published and no live Firebase data was changed by the repository update.
