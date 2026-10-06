# thechat v2.1.57 — GitHub Pages ready

Upload everything in this folder to the root of your GitHub Pages repository.

## Important
1. Apply `firebase-rules-v2.1.57.json` in Firebase Realtime Database Rules. These rules add file records, per-file privacy, persistent My Files indexing, viewer tracking, friend-request permission checks, and keep the existing call system.
2. GitHub Pages must serve over HTTPS for microphone, PWA, notifications, and service workers.
3. On first voice call, allow microphone permission in Chrome.
4. If users are on restrictive carrier/NAT networks, a TURN server may still be required even though STUN is configured.

## v2.1.57 fixes
- Accept / Decline / Cancel / End / Mute call buttons fixed.
- Cloudinary Save and notification/app-badge controls fixed after a module-scope regression.
- WebRTC ICE candidates are queued until the remote description is ready.
- Closing with Escape safely terminates the active/ringing call.


## v2.1.57 Settings
Settings are split into Privacy, Appearance, Storage, Chat, Account, and My Files tabs. Chat includes per-user conversation text size. Account supports custom profile-photo upload using the active Cloudinary profile or Firebase Storage fallback. My Files now uses a persistent per-user file index for new uploads and also supplements it with cached legacy attachments.


## v2.1.57 Settings navigation fix
- Removed the incorrect white/gray toolbar behind Settings tabs.
- Settings tabs now blend with Tahoe glass panel in Light, Gray, Dark and Navy themes.
- Horizontal scrolling and hidden scrollbar remain intact.


## v2.1.57 App badge default
The installed-app badge preference is ON by default for first-time users. Existing users who explicitly turned it OFF remain OFF until they re-enable it.

## v2.1.57 file sharing
- Drag and drop files into an open chat.
- Multi-select and send multiple files in one batch.
- File forwarding is disabled by default for other users; owners can enable it in Privacy.
- Per-file privacy in My Files: Only receiver / Friends only / Public.
- File owners can see unique viewers with profile avatars and open a Seen by list.
- Viewer list can send/accept friend requests when the viewed user allows friend requests.
- Apply firebase-rules-v2.1.57.json before using file privacy/view tracking.


## v2.1.57 Chat appearance
- Account: Use from file selects an existing image from My Files as the profile photo.
- Chat: upload or choose a My Files image as a fixed centered conversation background.
- Chat background opacity uses an Apple-style range slider.
- Settings navigation buttons now use a 3px transparent border.
