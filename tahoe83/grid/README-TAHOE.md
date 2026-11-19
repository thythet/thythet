# Grid — Tahoe81 web app

**Grid** is Tahoe81's self-hosted window and launcher for the **unmodified GridCraft Web v0.11.1** spreadsheet editor, distributed by the ArtCraft project.

- Original source: https://github.com/storytold/gridcraft
- Verified release: https://github.com/storytold/gridcraft/releases/tag/v0.11.1
- Self-hosting: https://github.com/storytold/gridcraft/blob/main/packaging/web/README.md

GitHub Actions installs the official release's static JS and WebAssembly files under `tahoe81/grid/`, pins its SHA-256 digest, and preserves license and attribution documents. The app is not fetched from ArtCraft when users open it; it is served from your own GitHub Pages path. Opening and saving spreadsheets uses the browser's file picker and downloads, with no integration into Tahoe Firebase or Cloudinary.

The compiled editor is unchanged and still branded GridCraft. **Grid** is only the name of the Tahoe wrapper and its separately designed icon. The upstream source is MIT OR Apache-2.0; bundled assets have their own license notices, and ArtCraft trademarks have additional restrictions. The wrapper claims no ArtCraft sponsorship or endorsement. A separate full Rust source-code fork is recommended for long-term maintainability. Functionality should be tested in a real browser before production use.
