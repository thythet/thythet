# Word — Tahoe81 web app

**Word** is Tahoe81's self-hosted launcher and window for the **unmodified WordCraft Web v0.10.0** document editor.

- Upstream source: https://github.com/storytold/wordcraft
- Official release: https://github.com/storytold/wordcraft/releases/tag/v0.10.0
- Self-hosting: https://github.com/storytold/wordcraft/blob/main/packaging/web/README.md

GitHub Actions verifies the official web release ZIP with SHA-256 and installs all its static WebAssembly and JavaScript files in `tahoe81/word/`. The app is then served by the Tahoe website; it does not depend on a live ArtCraft website to open. Open and Save use the browser picker and downloads, and there is no Tahoe Firebase or Cloudinary file-sync integration.

The compiled editor retains its original WordCraft branding. **Word** is the name and icon of the separate Tahoe launcher/window only. WordCraft code is MIT OR Apache-2.0, bundled assets have separate licenses, and ArtCraft names and marks are not open source and have separate restrictions. This integration claims no endorsement by upstream maintainers. A full Rust source-code fork should be kept separately for long-term development. Interactively test file opening, editing, saving, and exporting before using it for important documents.
