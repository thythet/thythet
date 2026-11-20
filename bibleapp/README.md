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
- Firebase Google sign-in integration is ready to configure for the web edition, with admin approval and manual cloud backups. Native desktop Google OAuth, automatic sync, professional exporters and PowerSlidePro interoperability remain incomplete.

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

The toolbar contains a compact EN/KH switch, borderless Search and Appearance buttons, and a text-size popover with instant 18–36 px updates, +/- adjustments, and persistent preferences. The account entry has no guest-status subtitle; its sidebar icon, account hero, and sign-in button use the user's exact four-color Google G SVG. Google sign-in is configured through Firebase Web App settings. It requires real project configuration; desktop Google OAuth still needs a secure system-browser flow.

The refreshed web cache uses a network-first strategy for HTML/CSS/JavaScript while retaining local Scripture files offline. This release keeps the existing `bibleapp.study.v1` and `bibleapp.prefs.v1` storage keys and does not alter original Bible JSON.

## v0.1.3 — quick reference and context formatting

- Type a **Chapter** and **Verse** in the two small top-toolbar input fields, then press Enter or **Go**. Out-of-range chapters and missing verses are rejected; the destination verse is selected and scrolled into view. Clicking a verse synchronizes both fields, and chapter arrows, dropdown and horizontal chapter row remain linked.
- Text size now uses a labeled **ទំហំអក្សរ** / **Text Size** control. Its smaller popover retains live 18–36 px resizing, +/- buttons and persistent preferences.
- **Right-click any verse** to open a compact formatting menu with Copy, Share, Save, **Color**, Note and **Present (បញ្ចាំង)**. Right-clicking one of multiple selected verses preserves the selection. On touch devices, long-press a verse or select a verse and tap the compact actions button. Keyboard users may press Shift+F10 or the Menu key on a focused verse.
- **Color choices are hidden until Color (ពណ៌) is clicked.** The menu then opens a dedicated palette of eight opaque highlights plus clear: blue, purple, pink, red, orange, yellow, green and gray. The existing local study-store keys and previously saved highlight names are preserved.
- The bottom-left sidebar Tools shortcut is removed. Tools remains accessible from **Account → Tools**.
- Reader and keyboard Help has been updated; offline web cache is versioned `bibleapp-web-v0.1.3`.

This is a shared Web/Tauri UI update. No Firebase rules, native Rust source, Bible JSON, PowerSlidePro files or other Tahoe folders are changed.

## v0.1.4 — Compact verse copying and drag selection

- Copy and Share now use **one Scripture reference per selection**. A continuous range, for example `ទំនុកដំកើង 1:1-4`, is followed by the complete text of verses 1–4, each prefixed by its verse number. A nonconsecutive selection uses accurate notation such as `1:1,3-4`; the Bible book name is not repeated for each verse.
- The Chapter:Verse inputs sit immediately beside the current book title without visible field labels or a Go button. Both inputs navigate when the user presses **Enter**; clicking a verse updates the Verse input.
- The compact Text Size popup no longer includes Small/Large captions. Live resizing and stored font preferences are unchanged.
- The extra chapter-count subtitle is removed beneath the reading title. The horizontal chapter row and dropdown remain synchronized.
- Hold the left mouse button and **drag across verse rows** in either direction to select them as a group. Ctrl/Command + drag adds a range to the existing selection. Shift-click, Ctrl/Command-click, right-click formatting, keyboard navigation, and touch long-press remain available.
- Selected verses now use the requested `#dcf3dc` pale-green background and **2px solid green border** (`#4caf50`). Saved solid highlight colors are preserved and reappear when a selected verse is deselected.
- The offline web cache is now `bibleapp-web-v0.1.4`. Existing `bibleapp.study.v1` and `bibleapp.prefs.v1` storage keys are unchanged.

This remains a shared Web + Windows/macOS Tauri UI update; installers are rebuilt separately by GitHub Actions.

## v0.1.5 — Tahoe83 appearance gallery and language switch

- **Account → Appearance** now offers six selectable appearance choices: **Classic** (the existing Bible App light/dark style, retained as default), Tahoe83 **Auto**, **Light**, **Dark**, **Gray**, and **Navy**. The preview swatches and color palette are adapted from `tahoe83/index.html` without importing the Tahoe desktop shell or modifying Tahoe83.
- The second row, **Liquid Glass**, offers **Clear** and **Tinted** for Tahoe83 themes. Clear uses more translucent local CSS panels; Tinted is more opaque. Glass controls are disabled for Classic, whose original visual styles remain unchanged.
- The current appearance, glass choice, and language are persisted in the existing `bibleapp.prefs.v1` local preference object. Existing saved notes, bookmarks and highlights (`bibleapp.study.v1`) are untouched.
- Auto follows the operating system light/dark preference via `prefers-color-scheme`; the existing moon/sun toolbar button switches Classic's dark flag or switches between Tahoe83 Light and Dark for quick access.
- The EN/KH toolbar control now shows **one sliding dot plus a single label**: ON = **KH**, OFF = **EN**, with no duplicate language labels. UI strings switch immediately; the Khmer 1954 Scripture stays in Khmer.
- The appearance styles, fonts and icons are bundled with the shared Web/Tauri frontend and require no external network service. Native Windows and macOS packaging is rebuilt separately by GitHub Actions. Offline web service worker cache: `bibleapp-web-v0.1.5`.

The prior Classic theme remains the default for current users. This update modifies only files under `bibleapp/`.

## v0.1.6 — Native Scripture text selection, bookmark indicators, and live color feedback

- **Select just the characters or words you want:** drag in the verse text or double-click a word for native browser text selection; Ctrl/Cmd+C and right-click Copy use that exact text rather than a whole-verse citation. The right-click menu remembers the selected text while the menu is open.
- **Select entire verses:** click the *blue verse number*, or click and drag from a blue verse number across other verses. Existing Shift-click, Ctrl/Command-click, multi-verse grouped Copy/Share, and Quick Slideshow remain available. Text dragging does not start whole-row selection. Touch long-press continues to open the formatting menu.
- **Saved-verse indicators:** every saved verse shows a small accessible bookmark icon at the right of the row. Click it to unsave. The right-click Save action switches to **Unsave** when all selected verses are already bookmarked; saving and unsaving reuse the existing `bibleapp.study.v1.bookmarks` keys without migration.
- **Immediate highlight colors:** when you choose a color in ពណ៌, a selected verse immediately displays that opaque saved color with its 2px green selection border. Selecting an uncolored verse still displays the requested pale green `#dcf3dc`. Deselecting restores the saved highlight without the selection border.
- **No Scripture or data schema changes:** all 66 Bible books, old saved highlights, notes, and preferences remain intact. The Web offline cache is bumped to `bibleapp-web-v0.1.6`. Windows/macOS share the same UI source and need new installers to reflect the changes.

The test script checks full-verse and native text-selection contracts, saved/unsaved bookmark behavior, and the eight immediate solid highlight colors.

## Account developer information (November 20, 2026)

- A centered, unobtrusive developer information footer appears **below the Account cards at the bottom of the Account page**, without a new card or border.
- It credits **THY THET / ធី ថេត**, records the creation date of **November 20, 2026 / ២០ ខែវិច្ឆិកា ឆ្នាំ២០២៦**, and states the purpose: make reading and searching Scripture and preparing Bible presentation slides easier.
- The copyright notice is **© 2026 THY THET. All rights reserved.** (and a Khmer equivalent).
- All four lines and the footer's accessible label use existing English/Khmer interface translations. The same bundled markup/styles work in the Web and Tauri Windows/macOS apps offline. No sign-in or network service is needed.
- Scope: only `bibleapp/` UI, translations, checks, and the Web cache revision `bibleapp-web-v0.1.7`; Bible JSON, user data, and existing apps are unchanged.


## v0.1.8 — Modifier-key verse selection and compact Account footer

- **Shift + click** anywhere on a verse row (including Scripture text) selects a continuous range from the last anchor verse; **Ctrl + click** on Windows or **Command + click** on macOS adds or removes individual verses, preserving nonconsecutive selections. These actions do not start native text-range selection. On macOS, use Command-click because Control-click may open the context menu.
- Plain dragging across Scripture text still supports native word/character selection. Clicking or dragging from the blue verse number still selects whole verses; saved bookmark icons do not interfere.
- The Account page's five navigation cards (Tools, Appearance, Settings, Bookmarks, Help) now show clean text without decorative glyph icons; the Google sign-in icon is preserved.
- The developer credit remains centered near the bottom of Account. The creation date and application purpose share **one continuous paragraph** in both languages, with separate developer and copyright lines. Excess spacing has been reduced so the footer is visible with the Account cards.
- All modifications remain within `bibleapp/` with the existing Bible JSON and local study storage unchanged. Offline Web cache bumped to `bibleapp-web-v0.1.8`; the Tauri Windows/macOS frontends share the same source.

The automated UI checks now exercise Shift/Ctrl/Command selection state, normal text selection, the Account footer structure, and preservation of the existing study features.

## Tools page icon-free layout

The Tools page header and five navigation cards (Create Slides, Bible Search, Export Center, Study Library, Help) now display titles and descriptions without decorative icons. The PowerSlidePro button, card navigation, all other pages, and saved Bible data are preserved. Offline cache revision: `bibleapp-web-v0.1.10`.

## Sidebar window controls (UI cleanup)

Removed the decorative red/yellow/green traffic-light dots from the Bible App sidebar in Web and Tauri desktop. The native macOS window controls remain managed by the OS and are unchanged. Offline cache updated to `bibleapp-web-v0.1.11`.


## Firebase accounts and owner administration (v0.2.0)

Bible App includes configurable Firebase Web Authentication and Realtime Database integration. These files do NOT constitute a live configured Firebase deployment.

- Google sign-in from the HTTPS web edition; Google display name, email and UID are shown in Account.
- All users start Pending and are approved by an active Owner or Admin.
- Account → Manage users offers search, approval/blocking, and Member/Editor roles. Only Owner can grant Admin. Owner privileges are granted securely from a trusted Admin SDK computer, never from the browser.
- Manual cloud backup Upload / Download / Restore. Both overwriting your cloud copy and restoring onto a device require confirmation.
- Firebase Realtime Database security rules are maintained outside this public repository and must be published and tested privately in Firebase Console.
- Trusted owner scripts to bootstrap the first Owner and to disable, enable, or delete a Firebase Authentication account.
- Local Scripture and all 66 books remain available offline without a Google account. Existing study storage keys are unchanged.

See firebase/SETUP.md for Firebase configuration, domain authorization, privately managing database rules, owner provisioning and production caveats. Public client configuration lives in web/firebase-config.js (never put a service-account private key there). No live rules are changed by source commits. Admin SDK scripts are in admin/.

**Not production-ready until live tested:** Actual Firebase credentials/config are not supplied, OAuth in Tauri desktop needs a secure system-browser PKCE integration, automatic cross-device conflict-safe sync and user self-service deletion are incomplete, and complete security-emulator / real-device acceptance tests, privacy policies and signed installers still need to be completed.
