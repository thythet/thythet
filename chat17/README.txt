thechat v2.1.60

Deploy all files in this folder to the same web directory.

Fixes / upgrades:
- Restored the 3-dot chat header menu and chat-row context menus.
- Restored search/filter/new-chat handlers accidentally lost in v2.1.46.
- Telegram-style photo preview before upload and photo-message display after sending.
- Voice-call menu is available only for confirmed private friends and call errors are more diagnostic.
- Personal Cloudinary / Firebase Storage upload support preserved.
- PWA notifications and app badge preserved.

Firebase:
Apply firebase-rules-v2.1.60.json to Realtime Database Rules for voice-call/storage paths.
For calls across restrictive NAT/firewall networks, configure a TURN server in addition to STUN.

v2.1.60 call reliability fix:
- Call Accept / Decline / Cancel / End / Mute handlers are now bound inside the Firebase module scope.
- Fixed a JavaScript scope regression that also affected Cloudinary save and notification/badge controls.
- Added queued ICE handling so candidates arriving before the remote SDP are not lost.
- Escape during a call now ends/declines/cancels the call instead of only hiding the call window.
- No Realtime Database rules change from v2.1.47 is required.


## v2.1.60 Settings
Settings are split into Privacy, Appearance, Storage, Chat, Account, and My Files tabs. Chat includes per-user conversation text size. Account supports custom profile-photo upload using the active Cloudinary profile or Firebase Storage fallback. My Files lists recent attachments from synced chats.


## v2.1.60 Settings navigation fix
- Removed the incorrect white/gray toolbar behind Settings tabs.
- Settings tabs now blend with Tahoe glass panel in Light, Gray, Dark and Navy themes.
- Horizontal scrolling and hidden scrollbar remain intact.


## v2.1.60 App badge default
The installed-app badge preference is ON by default for first-time users. Existing users who explicitly turned it OFF remain OFF until they re-enable it.

## v2.1.60 file sharing
- Drag and drop files into an open chat.
- Multi-select and send multiple files in one batch.
- File forwarding is disabled by default for other users; owners can enable it in Privacy.
- Per-file privacy in My Files: Only receiver / Friends only / Public.
- File owners can see unique viewers with profile avatars and open a Seen by list.
- Viewer list can send/accept friend requests when the viewed user allows friend requests.
- Apply firebase-rules-v2.1.60.json before using file privacy/view tracking.


## v2.1.60 Chat appearance
- Account: Use from file selects an existing image from My Files as the profile photo.
- Chat: upload or choose a My Files image as a fixed centered conversation background.
- Chat background opacity uses an Apple-style range slider.
- Settings navigation buttons now use a 3px transparent border.
