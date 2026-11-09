# Kid3Pro — Google profile photos in Admin Users

**GitHub code implemented. Firebase security rules NOT published.**

The Kid3Pro Admin → Users page now displays the real Google account profile picture where its `photoURL` has been saved, and keeps the standard person icon when it has not. The Khmer Users label is now **អ្នកប្រើ**.

## Why a Firebase rule change is necessary

The old account request schema rejects unknown children using `$other/.validate=false` and only permits the initial creation of `accountRequests/<uid>`. As a result, it does not allow a Google `photoURL` field and will not let someone with an existing pending request backfill a photo.

Approved people cannot write `users/<uid>` because those records contain privileged role and church information. To let them refresh a profile photo securely, allow writing **only** their own `users/<uid>/photoURL` child, not any role, church, or status field.

## Full Firebase rules file

The complete updated ruleset is also attached in the conversation as `kid3pro_firebase_rules_google_profile_photos.json`. It was built from the latest full class-owner editing rules previously prepared for Kid3Pro.

Compare the full file with your **currently published live Firebase rules**. Do not overwrite newer changes that may have been made in the Firebase Console.

Only three rule paths change:

1. `rules/accountRequests/$uid/.write` — preserve existing Admin and new-request rules; add a self-service branch that allows a pending Google user to update **only their own photo URL**, while all identity fields, status and request timestamps stay unchanged.
2. `rules/accountRequests/$uid/photoURL/.validate` — permit only a short HTTPS Google-hosted image URL (up to 2048 characters), without permitting other new fields.
3. `rules/users/$uid/photoURL` — permit approved, active Teacher/Pastor users to update **only** their own profile photo. Admins retain their existing parent write permissions; no self-service role/church/approval permission is added.

The profile photo validator uses the supported Realtime Database `.matches(/regex/)` syntax:

```json
{
  ".validate": "newData.isString() && newData.val().length <= 2048 && newData.val().matches(/^https:\\/\\/([A-Za-z0-9-]+\\.)*googleusercontent\\.com\\/.+$/)"
}
```

**Use the full attached JSON, not this one-field illustration, if replacing a rules document.**

## App behavior

- On a new Google login, the app stores `FirebaseUser.photoURL` with the pending account request if the rules allow it.
- Under the old rules, the app retries creating the original request **without** the photo URL, so approval is not broken.
- An existing pending account can **sign in with Google again after the rules update** to add the missing photo to its request.
- When Admin approves a request, a stored photo URL is copied into the approved user's record.
- Approved active accounts sync their own Google photo on their next sign-in, using the photo-only rule.
- Only Google-hosted HTTPS photo URLs are rendered. If an image fails to load or no URL exists, the user icon remains visible.
- Photo availability depends on the Google account providing a profile URL. The app cannot fetch another user's private Google photo directly from the administrator's session.

## Deployment and test

1. Back up the current live Firebase Realtime Database rules.
2. Compare the three proposed paths to your live rules and publish the carefully merged changes in **Firebase Console → Realtime Database → Rules**.
3. Have the pending Google user in the screenshot sign in again. Their pending request remains pending, but the authenticated profile photo URL should now save.
4. Open Admin → Users → Pending and verify the profile photo appears. Approve; verify the same photo appears in Active.
5. Verify a Teacher cannot change their role or church by writing directly to `users/<uid>` and cannot edit another person's profile.
6. Confirm the Admin/Pastor/Class/Attendance rules and all old Kid versions still operate normally.

**Firebase updates were not performed on the live database.** JavaScript and 19 expression-level permission scenarios passed, but real Firebase Emulator / production sign-in tests remain necessary.
