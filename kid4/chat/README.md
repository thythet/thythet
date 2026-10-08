# thechat v2.1.63

GitHub Pages / static-host ready build.

## Upload
Upload all files in this folder to the same web directory. Keep `manifest.webmanifest`, `sw.js`, and `icons/` next to `index.html`.

## Voice-call reliability
The app always uses STUN. For networks that need a relay, open **Settings → Chat → Voice call quality**, enable **TURN relay**, and enter a Metered TURN **domain** plus a **TURN credential API key**. Do not put an account Secret Key in the browser app. Use **Test relay** before calling.

Audio modes: Data saver (32 kbps), Standard (48 kbps), High (96 kbps), Maximum (160 kbps). Browsers/devices may negotiate lower values when necessary.

## Firebase
No new Realtime Database rule paths are required compared with v2.1.60 because call settings are stored under the existing private `storageSettings/$uid` path. A compatible rules file is included for convenience.
