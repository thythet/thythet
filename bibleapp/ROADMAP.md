# Bible App Roadmap

## 0.1 — Offline Bible foundation
- [x] Tauri 2 project skeleton with one custom Rust `main.rs`
- [x] Local 66-book JSON Bible, bundled Khmer font catalog
- [x] Tahoe-style shell: account header, fixed Testament buttons, book list, reader canvas
- [x] Local copy, multi-verse selection, highlight, bookmarks, note entry, reading preferences
- [x] Quick fullscreen presentation of selected Scripture
- [x] Background local text search
- [ ] Native Windows/macOS build and real-device smoke tests (not performed yet)

## 0.2 — Smart Bible
- [ ] Port/verify the robust reference parser from Tahoe83 PowerSlidePro (not the entire editor)
- [ ] Mixed Khmer/English names, digits, disambiguation, range validation and multi-passage programs
- [ ] Editable slide model and theme templates, robust Khmer line fitting

## 0.3 — Presentation interoperability
- [ ] Editable .deckcraft writing compatible with installed PowerSlidePro
- [ ] Launch installed PowerSlidePro with generated project on Windows/macOS; chooser fallback
- [ ] PPTX export, round-trip tests and app detection

## 0.4 — Export center
- [ ] DOCX and PDF with real Khmer text, PNG/JPG/WebP/SVG, TXT/Markdown/HTML
- [ ] Slide batch export, selectable page sizes, font checks and output validation

## 0.5 — Durable study workspace
- [ ] SQLite notes, bookmarks, highlights, history, migrations, backups and restore
- [ ] First launch migration from local prototype store
- [ ] Optional Google sign-in using system-browser OAuth, Firebase sync and offline conflict rules

## 0.6+ — Presentation/production
- [ ] Second-display presenter window, remappable shortcuts, themes and font manager
- [ ] Installer smoke tests, offline Windows WebView2 bundling, Apple Silicon + Intel distribution
- [ ] App signing/notarization, privacy/data-loss tests, provenance/license review

## Acceptance criteria
1. Bible chapter rendering is correct for all 66 books and 31,101 declared verses.
2. Full app can read/search/present without the internet, and the source data matches Tahoe83 SHA-1 blobs.
3. Ctrl/Cmd disjoint selection and Shift range selection do not accidentally clear or overwrite selections.
4. Offline changes remain local until the user explicitly enables online sync.
5. `bibleapp/` is the only updated repository folder.
