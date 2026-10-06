# thechat v2.1.49 — GitHub Pages ready

Upload everything in this folder to the root of your GitHub Pages repository.

## Important
1. Apply `firebase-rules-v2.1.49.json` in Firebase Realtime Database Rules. These rules are unchanged from v2.1.47 for the call system.
2. GitHub Pages must serve over HTTPS for microphone, PWA, notifications, and service workers.
3. On first voice call, allow microphone permission in Chrome.
4. If users are on restrictive carrier/NAT networks, a TURN server may still be required even though STUN is configured.

## v2.1.49 fixes
- Accept / Decline / Cancel / End / Mute call buttons fixed.
- Cloudinary Save and notification/app-badge controls fixed after a module-scope regression.
- WebRTC ICE candidates are queued until the remote description is ready.
- Closing with Escape safely terminates the active/ringing call.
