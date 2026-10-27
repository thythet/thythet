# Effect — Tahoe81 integration

**Effect** is Tahoe81's self-hosted window and launcher for the unmodified **EffectCraft Web v0.16.0** motion graphics editor.

Standalone: `https://thythet.com/tahoe81/effect/`
Upstream: https://github.com/storytold/effectcraft
Web release: https://github.com/storytold/effectcraft/releases/tag/v0.16.0
Hosting guide: https://github.com/storytold/effectcraft/blob/main/packaging/web/README.md

The GitHub Actions installer checks the upstream ZIP against a pinned SHA-256 digest and installs the complete WebAssembly and JavaScript web app, workers, service worker, manifest, bundled resources and original license notices. The Tahoe desktop window is called **Effect**, but the original editor still displays its upstream EffectCraft name and trademarks. Changing the compiled editor's branding requires a separate Rust source rebuild without restricted marks.

Effects, media, and projects are stored in browser storage, with project saving/export through browser downloads. The app does not sync to Tahoe Firebase or Cloudinary. Browser capabilities and available RAM constrain large renders. Opening, editing and exporting should be tested in the target browser.

Source code: MIT OR Apache-2.0. The ArtCraft name and marks carry separate restrictions. Bundled third-party assets have separate attribution requirements. This wrapper does not claim upstream sponsorship or endorsement.
