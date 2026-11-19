# Bible App — Khmer Bible 1954

Standalone, offline-first Bible desktop application for Windows and macOS built with Tauri 2, Rust and local HTML/CSS/JavaScript.

## Current scope: v0.1.0 foundation

- Bundled 66 Bible JSON files and original manifest copied unchanged from `tahoe83/data`.
- Khmer Bible Reader with compact, resizable sidebar, fixed Old/New Testament selectors, book search, chapter navigation, and a clean Tahoe-style reading canvas without decorative hero cards.
- Individual, range (Shift) and disjoint (Ctrl on Windows / Cmd on macOS) verse selection.
- Copy, bookmark, multi-color highlight and local notes for selected verses.
- Quick Scripture presentation of selected verses (browser fullscreen where available).
- Local search worker, themes, Khmer/English interface switch, resizable sidebar and reader text-size preferences (all persistent).
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

## UI controls

Drag the vertical divider between the Bible book sidebar and the reading canvas to resize it, or focus the divider and use Left/Right arrows. Switch EN / KH beside Dark Mode; Scripture and book titles always remain in original Khmer. Clicking a Testament tab opens a book from that Testament, preventing the reader and tab from disagreeing. Existing localStorage study keys are unchanged.



## UI refinements (November 2026)

The Web and Tauri interfaces share a single Tahoe Admin-style reader. The scrollable sidebar shows all 66 books in one Finder-style list, separated into Old and New Testament sections. The two top Testament buttons jump between sections rather than hiding books or changing the current Scripture. The selected book remains blue, with alternating muted rows. Sidebar width is adjustable and persisted.

The Reader toolbar shows the **current Khmer book name**; no large decorative hero card or reading instructions occupy the reading canvas. A horizontally scrolling row of chapter buttons stays synchronized with Previous, Next, and the chapter dropdown. Instructions for Shift/Ctrl/Command multi-verse selection live under **Account → Help** (also accessible through Tools).

The toolbar contains a compact EN/KH switch, borderless Search and Appearance buttons, and a text-size popover with instant 18–36 px updates, +/- adjustments, and persistent preferences. The account entry has no guest-status subtitle; its sidebar icon, account hero, and sign-in button use the user's exact four-color Google G SVG. Google sign-in is **not yet functional**; the control continues to show a clear planned-feature message.

The refreshed web cache uses a network-first strategy for HTML/CSS/JavaScript while retaining local Scripture files offline. This release keeps the existing `bibleapp.study.v1` and `bibleapp.prefs.v1` storage keys and does not alter original Bible JSON.
