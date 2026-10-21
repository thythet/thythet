# PowerSlidePro Desktop — Tahoe79 offline distribution

The installer embeds Tahoe79's **actual WebAssembly presentation editor**,
not a second, unrelated slide editor. Electron provides a local-only server,
native desktop windows and Save dialogs. Internet is not required to create,
edit, export or present local slides after installation.

## Build

Use Node.js 22 and npm on a Windows or macOS build computer:

    cd tahoe79/powerslidepro-desktop
    npm install
    npm run check
    npm run dist:win       # Windows x64 NSIS installer, requires Windows
    npm run dist:mac       # macOS Intel and Apple Silicon DMGs, requires macOS

The GitHub workflow .github/workflows/build-powerslidepro-desktop.yml builds
platform packages and publishes a beta GitHub Release once both OS builds pass.
The Tahoe79 download panel discovers actual uploaded release assets, never
pretends an absent installer is available.

## Included

- Tahoe79 PowerSlidePro WebAssembly runtime and current Tahoe79 editor UI.
- All 66 offline Bible JSON books; Smart Bible Generate and Bible Generate.
- 40 Khmer OS fonts plus Tahoe79's associated runtime font assets.
- Local presentation saving via the native OS file dialog.
- PPTX and other exports through the existing web editor download path.
- Existing Tahoe79 Presenter/Audience bridge with a separate native popup.

## Not included / release limitations

- Tahoe online admin dashboard, Firebase, Cloudinary and Google login.
- Automatic migration of cloud presentations: export these before disconnecting.
- The separate upstream Rust desktop binary; the Tahoe79 WASM editor is used
  to preserve Bible and Tahoe-specific UI.
- Cross-window *live editing* is not integrated in the desktop beta.
- Packages are currently **unsigned** and macOS packages **not notarized**:
  operating systems may warn or block launches until explicit approval.
- Automated packaging checks cannot replace real Windows/macOS and dual-monitor
  testing; verify fonts, editable files and PPTX exports before production use.

All project changes live under Tahoe79 or in its dedicated CI workflow.
Tahoe78 and earlier versions and user cloud data remain unchanged.

## Branding and installer verification (v0.1.1)

- The official blue P icon is converted from the supplied artwork into
  Windows `build/icon.ico`, macOS `build/icon.icns` and `build/icon.png`.
- App metadata and About menu read **Built and Prepared by Thet**.
- Release uploads include `SHA256SUMS.txt` for independently verifying the
  exact installers downloaded from GitHub.
- Windows installer scan and Authenticode reporting run in GitHub Actions.
  If Microsoft Defender is unavailable, logs explicitly say it was **not scanned**.
- To sign a Windows build legitimately, configure repository Actions secrets
  `POWERSLIDEPRO_WIN_CSC_LINK` (PFX file or signing provider URL) and
  `POWERSLIDEPRO_WIN_CSC_KEY_PASSWORD` (the matching credential).
  A certificate issued to the verified publisher is required. No credentials
  are stored in the repository; absence retains an unsigned beta.
- Signing alone cannot guarantee removal of Microsoft SmartScreen prompts;
  verified publisher identity and app reputation are managed by Windows.
