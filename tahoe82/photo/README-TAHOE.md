# Photo — Tahoe81 web app

**Photo** is Tahoe81's self-hosted wrapper around the unmodified official **PhotoCraft Web v0.14.0** editor. It works independently at `/tahoe81/photo/` and in a draggable, resizable Tahoe window.

Source: https://github.com/storytold/photocraft
Release: https://github.com/storytold/photocraft/releases/tag/v0.14.0

The runtime assets, boot loader, segmented WASM engine, and necessary license notices are installed by `.github/workflows/install-photo-tahoe81.yml` with SHA-256 verification. Normal file operations use the browser picker/downloads; there is no Firebase storage integration. Edit/save/export work should be tested interactively before relying on the app with important images.

Code is MIT OR Apache-2.0; required notices and third-party license conditions remain. The ArtCraft trademark/brand license is separate. The upstream editor is not rebuilt or rebranded; only Tahoe's external launcher and window are called "Photo". No association with or endorsement by the ArtCraft team is implied.
