# Vector — Tahoe81 integration

Vector is Tahoe81's launcher for the upstream **VectorCraft Web v0.16.0** editor.

The web build is self-hosted in this directory, including the JavaScript/WASM files and font resources. Its embedded upstream interface is unmodified. The Tahoe window and shortcut are named **Vector**; modifying the original app's internal name requires a separate rebuild from source with removal of restricted ArtCraft trademarks.

Upstream: https://github.com/storytold/vectorcraft
Release: https://github.com/storytold/vectorcraft/releases/tag/v0.16.0

VectorCraft code: MIT OR Apache-2.0, with required notices and separately licensed bundled assets. For forks/rebranding, follow `docs/brand/LICENSE-brand.txt` in the upstream repository. This Tahoe integration does not claim ArtCraft endorsement.

The web app is independently navigable at `/tahoe81/vector/`; it requires secure HTTPS for WebGPU and clipboard support. GitHub Pages can serve its static relative-path assets.
