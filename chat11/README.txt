thechat v2.1.52

Deploy all files in this folder to the same web directory.

Fixes / upgrades:
- Restored the 3-dot chat header menu and chat-row context menus.
- Restored search/filter/new-chat handlers accidentally lost in v2.1.46.
- Telegram-style photo preview before upload and photo-message display after sending.
- Voice-call menu is available only for confirmed private friends and call errors are more diagnostic.
- Personal Cloudinary / Firebase Storage upload support preserved.
- PWA notifications and app badge preserved.

Firebase:
Apply firebase-rules-v2.1.52.json to Realtime Database Rules for voice-call/storage paths.
For calls across restrictive NAT/firewall networks, configure a TURN server in addition to STUN.

v2.1.52 call reliability fix:
- Call Accept / Decline / Cancel / End / Mute handlers are now bound inside the Firebase module scope.
- Fixed a JavaScript scope regression that also affected Cloudinary save and notification/badge controls.
- Added queued ICE handling so candidates arriving before the remote SDP are not lost.
- Escape during a call now ends/declines/cancels the call instead of only hiding the call window.
- No Realtime Database rules change from v2.1.47 is required.


## v2.1.52 Settings
Settings are split into Privacy, Appearance, Storage, Chat, Account, and My Files tabs. Chat includes per-user conversation text size. Account supports custom profile-photo upload using the active Cloudinary profile or Firebase Storage fallback. My Files lists recent attachments from synced chats.
