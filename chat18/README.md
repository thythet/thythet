# thechat v2.1.61 — GitHub Pages ready

Upload everything in this folder to the root of your GitHub Pages repository.

## Important
1. Apply `firebase-rules-v2.1.61.json` in Firebase Realtime Database Rules. These rules add file records, per-file privacy, persistent My Files indexing, viewer tracking, friend-request permission checks, and keep the existing call system.
2. GitHub Pages must serve over HTTPS for microphone, PWA, notifications, and service workers.
3. On first voice call, allow microphone permission in Chrome.
4. If users are on restrictive carrier/NAT networks, a TURN server may still be required even though STUN is configured.

## v2.1.61 fixes
- Accept / Decline / Cancel / End / Mute call buttons fixed.
- Cloudinary Save and notification/app-badge controls fixed after a module-scope regression.
- WebRTC ICE candidates are queued until the remote description is ready.
- Closing with Escape safely terminates the active/ringing call.


## v2.1.61 Settings
Settings are split into Privacy, Appearance, Storage, Chat, Account, and My Files tabs. Chat includes per-user conversation text size. Account supports custom profile-photo upload using the active Cloudinary profile or Firebase Storage fallback. My Files now uses a persistent per-user file index for new uploads and also supplements it with cached legacy attachments.


## v2.1.61 Settings navigation fix
- Removed the incorrect white/gray toolbar behind Settings tabs.
- Settings tabs now blend with Tahoe glass panel in Light, Gray, Dark and Navy themes.
- Horizontal scrolling and hidden scrollbar remain intact.


## v2.1.61 App badge default
The installed-app badge preference is ON by default for first-time users. Existing users who explicitly turned it OFF remain OFF until they re-enable it.

## v2.1.61 file sharing
- Drag and drop files into an open chat.
- Multi-select and send multiple files in one batch.
- File forwarding is disabled by default for other users; owners can enable it in Privacy.
- Per-file privacy in My Files: Only receiver / Friends only / Public.
- File owners can see unique viewers with profile avatars and open a Seen by list.
- Viewer list can send/accept friend requests when the viewed user allows friend requests.
- Apply firebase-rules-v2.1.61.json before using file privacy/view tracking.


## v2.1.61 Chat appearance
- Account: Use from file selects an existing image from My Files as the profile photo.
- Chat: upload or choose a My Files image as a fixed centered conversation background.
- Chat background opacity uses an Apple-style range slider.
- Settings navigation buttons now use a 3px transparent border.

## v2.1.61 transparent partner PNG fix
- Transparent PNG image messages from partner/incoming users remain fully transparent even when a custom partner bubble color or gradient is enabled.
- No media-card fill, bubble fill, shadow, or rounded background is applied to transparent PNG messages on either side.


### v2.1.61
- Grouped multi-file messages: drag/drop or multi-select uploads are sent as one stacked attachment message.
- The first attachment is shown on top with a count badge.
- Individual files still keep their own fileId/privacy/view tracking records.

## v2.1.61 additions
- My Files: Delete action and new **Only me** privacy option.
- Only-me files are hidden from other users in the thechat UI; file privacy rules deny non-owner file-record access.
- Private-chat background is now shared per conversation and editable from the partner Profile → Background. Both chat members see the same background and opacity.
- Firebase-hosted files are deleted from Firebase Storage when possible. Cloudinary unsigned uploads cannot be securely deleted from Cloudinary by a static client, so Delete removes the thechat records/message; delete the original in Cloudinary too if needed.
