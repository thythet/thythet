# Tahoe83 macOS installer naming policy

Applies to future PowerSlidePro and HolyBible (BibleApp) releases.

| Platform | New published filename pattern | Existing compatibility pattern |
| --- | --- | --- |
| Apple Silicon (M-series) | `PowerSlidePro-VERSION-mac-M-Series.dmg`, `BibleApp-VERSION-mac-M-Series.dmg` | `*-mac-arm64.dmg` |
| Intel | `PowerSlidePro-VERSION-mac-Intel.dmg`, `BibleApp-VERSION-mac-Intel.dmg` | `*-mac-x64.dmg` |

Windows filenames remain unchanged. Do not rename or delete already published assets. Existing direct URLs and updater metadata must continue to work.

For the next release, retain the build-generated canonical installers and any updater metadata/blockmaps, and stage byte-identical clearly named DMG copies for manual downloads before generating SHA256SUMS.txt. Include both canonical and friendly filenames in the release checksums and verify them. For PowerSlidePro, do not rewrite electron-builder updater metadata to point at aliases; retain the referenced canonical files. For BibleApp, update the standalone download catalog to accept friendly names before publishing a new version (its existing catalog is version-specific).

Example commands, run in the release staging directory after building, with the actual new version and product prefix:
```sh
cp "$product-$version-mac-arm64.dmg" "$product-$version-mac-M-Series.dmg"
cp "$product-$version-mac-x64.dmg" "$product-$version-mac-Intel.dmg"
```

Tahoe83 Get Software supports both naming formats, prefers the friendly filename when present, and discovers published version tags. It requires complete installer sets and a checksum for newly discovered releases. Existing HolyBible v0.1.1 direct links remain a fallback.

The existing version-specific release workflows are not modified by this policy. Apply the staging steps in the next release workflow, then test and publish.
