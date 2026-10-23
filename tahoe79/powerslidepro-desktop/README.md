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

## Windows .deckcraft icon and file association (v0.1.2)

The regular **PowerSlidePro Windows installer now installs everything in one step**:
- The original application icon remains the icon for PowerSlidePro itself.
- The dedicated supplied blue 3D cross / slide icon is used for `.deckcraft` documents.
- The NSIS installer registers `.deckcraft` as a PowerSlidePro Presentation file type with Open With / double-click support.
- The installer is machine-wide (`nsis.perMachine: true`), so Windows displays the UAC administrator approval prompt at installation time. No second icon installer or registry script is required.
- Windows respects existing per-user default-app choices: if another program is selected for `.deckcraft`, Windows may display that program's icon until the user sets PowerSlidePro as the default.
- On uninstall, NSIS removes the association according to electron-builder's standard file-association behavior.
- To open an associated file, launch PowerSlidePro from a `.deckcraft` file in Explorer. The desktop shell passes its bytes only to the embedded PowerSlidePro editor; it does not execute the file or modify it during opening.

To test: install the `PowerSlidePro-0.1.2-win-x64.exe` package, save a `.deckcraft` file, verify the icon in Windows Explorer, double-click it, and check its slides open and remain editable. If Windows retains an old icon, check **Open with → Choose another app → PowerSlidePro**. The desktop installer is distinct from the Chrome/PWA web installation.

## Software Updates (Windows v0.1.3)

The installer embeds `electron-updater` and a GitHub Releases update feed for `thythet/thythet`.
The app checks for updates shortly after launch and every six hours while running and online. A small top-right **Update** badge appears only when a newer version is available. **Help → Check for Updates…** opens the update panel manually.

Users choose **Download**, then **Restart & Install**. All downloads are verified with the SHA-512 supplied in the same GitHub Release's `latest.yml`. Automatic download/restart and install-on-quit are disabled. The per-machine Windows installer may request UAC elevation. Save all presentations before restarting; unsaved changes are not automatically saved.

Existing **0.1.2** builds have no updater and must be installed over once to get 0.1.3; later versions can update from within the app. The updater requires connectivity only to check/download an update. Offline editing, local presentations and export remain local. Updates do not delete saved `.deckcraft` files.

The presentation's Chromium session is isolated from the updater session; the iframe remains restricted to the local offline server. The renderer can only invoke specific, validated main-process updater actions, not choose arbitrary executable URLs. Update assets and metadata are published together to the `powerslidepro-desktop-vX.Y.Z` GitHub release with `latest.yml` and checksum files.

**Security note:** Signed installers are strongly recommended for production. SHA-512 protects downloads against corruption/tampering in transit relative to the retrieved update manifest, but it is not a replacement for authenticated signed releases. The initial beta is still unsigned unless signing secrets are configured. macOS auto-install is intentionally disabled until signing/notarization is available; users download new DMGs manually.

## Desktop and browser font libraries (v0.1.4)

The existing bundled PowerSlidePro / Khmer OS fonts remain intact and at the top of the font dropdown. On Windows the Electron main process reads only standard HKLM and HKCU Windows-installed font registry catalog entries. It returns **font family names**, with paths kept inside the trusted desktop process. When a user selects an installed PC font, Electron reads that registered font file (TTF/OTF/TTC, with size limit) and sends its bytes to the PowerSlidePro WebAssembly FontDb for actual slide rendering. “Rescan Installed Fonts” refreshes the Windows registry catalog. No font is uploaded to a server.

Tahoe79 Web includes a new **Font Manager** (inside the font dropdown) to drag and drop .TTF/.OTF files, validate and load them in the same WebAssembly FontDb, and persist the bytes in that browser's IndexedDB. The library is restored when the editor starts, works offline after initial app caching, and supports removal (reopen the editor to unload removed fonts). Imported fonts are local to each browser profile. A presentation shared to another computer may require the same font or lawful embedding to look identical.

Browser web pages cannot silently scan computer font folders. PowerSlidePro Desktop is the only edition that enumerates system-installed font names automatically. Font import does not install fonts into Windows itself. Some large/unsupported/corrupt font formats may be rejected.

### Installer rebuild synchronization

The font-enabled Tahoe79 WASM build is committed separately by GitHub Actions (compiled engine commit `85a9dbccde81858eb6cb5bb97b774c8587b02374`). Repackage Desktop **after** that build so the Windows and macOS installers embed the actual updated WASM and browser Font Manager, not the previous compiled runtime. The GitHub Release workflow republishes the v0.1.4 installers and checksums from that synchronized build.

### v0.1.5 — Khmer OS bundled font restoration

The offline package retains all 40 Khmer OS font files. The font menu now advertises Khmer OS families immediately, keeps them in **Bundled Fonts** even when a PC-installed font has the same name, and loads a selected bundled face on demand. Browser Font Manager and PC-font detection remain available. This installer is built against the corresponding newly compiled Tahoe79 WASM engine.

## v0.1.6 — Apple Silicon beta signing repair

The macOS app bundle is **ad-hoc code signed** after Electron packs its files and prior to DMG creation. GitHub Actions verifies valid signatures for both ARM64 and x64 application bundles. This avoids shipping structurally unsigned Electron ARM executables that some macOS versions describe as “damaged”. These ad-hoc signatures are **not trusted Apple Developer ID signatures and are not notarized**. Users may still have to manually approve the app in System Settings → Privacy & Security after verifying the official download; the program should be copied to Applications before opening. The app remains offline-capable and bundled presentation files/fonts are unchanged.

The permanent solution remains Developer ID Application signing followed by Apple notarization/stapling, using GitHub Actions secrets. Do not market ad-hoc signing as trusted/notarized, and do not advise globally disabling Gatekeeper.

## v0.1.7 — Paste repair on macOS, Windows and Tahoe79 Web

Added macOS/Windows **Edit → Paste** and other native editing roles, and a context menu on native editable fields. Song/Smart Generate native Khmer textareas now isolate their key, composition and paste events from WASM editor-wide shortcuts, allowing native Cmd+V and Ctrl+V without preventing browser default processing. Both generators have a user-triggered **Paste** button; Desktop reads plain-text clipboard through restricted Electron IPC and inserts at the caret in the generator textarea. The browser button uses the Clipboard API with a visible permission/error fallback; regular keyboard paste also works independently of Clipboard API permissions. No clipboard content is uploaded to the internet, and the Allsong/Khmer font/Bible data and earlier Tahoe versions are unchanged.

## v0.1.8 — song metadata, grouped Undo and macOS Finder document type

**Song metadata** now lives in serialized slide `tags` rather than speaker notes. Existing notes-only presentations continue to load, and editing old Notes migrates their metadata to tags. User-authored speaker notes remain editable. Generating all songs, applying Song Formatting and splitting sections are atomic actions in the undo/redo history (failure rolls back the entire action).

**macOS document registration**: the Mac app bundles `deckcraft.icns`, made from the supplied blue cross-and-slide PNG, and registers `.deckcraft` as `PowerSlidePro Presentation` with Editor/Owner role in the macOS Info.plist. The normal PowerSlidePro application icon is unchanged. Finder associates the icon once the app is installed and registered; the user can choose PowerSlidePro via Get Info → Open with → Change All. Double-clicking uses the existing Electron `open-file` handler. GitHub Actions validates the document icon, CFBundleDocumentTypes and ad-hoc bundle signature.
