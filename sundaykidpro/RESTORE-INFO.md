> **Historical document.** The current `sundaykidpro/` release no longer contains the nested Chat PWA, Report tab or `dashboard.html`. Paths and features below describe the older Kid3Pro restore.

# Kid3Pro — Restored historical Love Kid Pro

This folder is a complete independent **source-code copy** of `kid2pro/` as it existed in GitHub commit
`a021b540931c9e190b951562cfe37458118f13d8`.

## URLs

- Restored version: https://thythet.com/kid3pro/
- Latest version: https://thythet.com/kid2pro/ (not modified)
- Original version: https://thythet.com/kid2/ (not modified)

## What changed from the historical source

All historical files, including nested chat, icons, fonts, app sources and static assets, are retained exactly except for these path/installation isolation changes:

- `index.html`: the Summary sync-scroll local preference uses a distinct `kid3pro_summary_sync_scroll` key.
- `manifest.webmanifest`: the installed PWA has its own name and ID `/kid3pro/`. Start URL and scope remain relative to this folder.
- `sw.js`: uses isolated cache keys `lovekid-3pro-shell-*`; does not delete other apps' caches.
- `pwa-install.js`: installation text identifies Love Kid 3 Pro; service worker still registers relative to its directory.
- `chat/sw.js`: uses isolated `kid3pro-thechat-v*` caches; its separate nested `chat/` PWA is preserved.

No deployment scripts, Firebase Security Rules, or Firebase database data were altered. No assets have been regenerated.

## Shared live data — important

The restored code intentionally uses the **same Firebase project and Cloudinary settings** as the historical version. It is a separate *code release*, **not a separate database**.

A student, class, or attendance change made through this restored app can affect what appears in the latest `kid2pro/`, because both use the same live backend. The local Cloudinary configuration key is retained for compatibility.

To isolate data as well, a different Firebase project/database and Cloudinary configuration would be required, and should be planned separately before any migration.

## How to restore again

Use GitHub's tree object at `a021b540931c9e190b951562cfe37458118f13d8:kid2pro` as the base subtree. Do not reset the `main` branch or overwrite `kid2pro/`.

