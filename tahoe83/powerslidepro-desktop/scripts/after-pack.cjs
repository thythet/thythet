'use strict';
/**
 * Apple Silicon needs a structurally valid code signature even for an
 * unsigned beta. This ad-hoc signature is NOT a Developer ID signature and
 * DOES NOT remove macOS Gatekeeper/notarization warnings.
 *
 * Replace with proper Developer ID signing + notarization for public release.
 */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const name = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, name + '.app');
  if (!fs.existsSync(appPath)) throw new Error('Missing PowerSlidePro .app before signature');
  // The macOS CI beta intentionally has no Apple signing credentials.
  // Re-sign Electron's nested frameworks after app packaging changes.
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--verbose=2', appPath], { stdio: 'inherit' });
  console.log('Verified ad-hoc signature for ' + appPath + ' (not notarized).');
};
