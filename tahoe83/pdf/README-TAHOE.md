# PDF — Tahoe81 integration

**PDF** is the Tahoe81 desktop-window launcher for the upstream **PdfCraft Web v0.13.0** editor, hosted locally at `/tahoe81/pdf/` on the same GitHub Pages site.

Source: https://github.com/storytold/pdfcraft
Release: https://github.com/storytold/pdfcraft/releases/tag/v0.13.0
Self-hosting: https://github.com/storytold/pdfcraft/blob/main/packaging/web/README.md

The GitHub Actions installer pins and verifies the official ZIP with SHA-256 and installs all static JS/WASM files plus copyright notices. The embedded upstream editor is unchanged; only the Tahoe desktop window and launcher are named **PDF**. There is no Firebase file sync integration; Open/Save/Export use the browser. Print and some other native-only features are unavailable in the web app.

PdfCraft source is MIT OR Apache-2.0; assets have separate license terms. ArtCraft marks remain subject to `docs/brand/LICENSE-brand.txt`; modifying or rebranding the original compiled editor requires a separate source rebuild and removal of restricted marks. This integration does not claim sponsorship or endorsement by the upstream authors.

Test opening, editing, saving, and exporting sample PDFs before relying on this editor for production documents.
