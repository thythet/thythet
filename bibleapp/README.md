# Bible App — Khmer Bible 1954

Standalone, offline-first Bible desktop application for Windows and macOS built with Tauri 2, Rust and local HTML/CSS/JavaScript.

## Current scope: v0.1.0 foundation

- Bundled 66 Bible JSON files and original manifest copied unchanged from `tahoe83/data`.
- Khmer Bible Reader with fixed Old/New Testament selectors, book search, chapter navigation, and a clean Tahoe-style reading canvas.
- Individual, range (Shift) and disjoint (Ctrl on Windows / Cmd on macOS) verse selection.
- Copy, bookmark, multi-color highlight and local notes for selected verses.
- Quick Scripture presentation of selected verses (browser fullscreen where available).
- Local search worker, themes and reader text-size preferences.
- Tools area with early `បង្កើតស្លាយ` reference preview. This is not yet the full PowerSlidePro-equivalent generator.
- Google login, Firebase sync, production exporters, PowerSlidePro launching and installers are **not yet implemented**.

## Setup

Requires Node.js, Rust, operating-system prerequisites for Tauri 2.

```sh
cd bibleapp
npm install
npm run check
npm run dev
```

Create a release build on the target platform:

```sh
npm run build
```

The `icons` script derives Windows/macOS icon files from `src-tauri/icons/icon.png` before builds. This foundation uses the pre-existing Tahoe icon as a temporary placeholder.

## Offline behavior

All 66 books and Khmer OS fonts are shipped in `web/`. No network is needed for Bible reading, local search, selection, or the initial slideshow. Notes, bookmarks, highlights and settings currently live in **device-local browser/WebView storage**, not SQLite; do not treat this as a backed-up cloud account. Subsequent releases will move saved content to SQLite with data migrations and backups.

## Source organization

- `src-tauri/src/main.rs` — one native Rust entry point.
- `web/index.html` — accessible application structure.
- `web/style.css` — Tahoe-inspired appearance.
- `web/app.js` — reading, selection, study features, presentation and navigation.
- `web/search-worker.js` — 66-book background search.
- `web/data/` and `web/assets/fonts/` — original bundled Bible and fonts.

## Preservation and distribution

Only `bibleapp/` is modified. Tahoe83, existing PowerSlidePro, their cloud services and earlier Tahoe versions remain unchanged. Confirm redistribution permission for the Bible text and fonts before publishing public installers.
