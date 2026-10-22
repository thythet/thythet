'use strict';
// Electron-updater is isolated in the Electron main process. The local WASM
// presentation editor has no access to update URLs, installers or filesystem paths.
const { EventEmitter } = require('node:events');

const GITHUB_RELEASES = 'https://github.com/thythet/thythet/releases';
const GITHUB_PROVIDER = Object.freeze({ provider: 'github', owner: 'thythet', repo: 'thythet' });
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function createDesktopUpdater({ app, dialog, platform = process.platform, updater, getWindow, notify }) {
  if (!app || !dialog || typeof getWindow !== 'function' || typeof notify !== 'function')
    throw new Error('Missing desktop update dependencies');
  let state = { phase: 'idle', currentVersion: app.getVersion(), version: '', percent: 0, message: '' };
  let busy = false;
  let timer = null;
  const supported = platform === 'win32' && app.isPackaged;
  function publish(phase, update = {}) {
    state = { ...state, ...update, phase };
    notify({ ...state });
    return { ...state };
  }
  if (!supported || !updater) {
    publish('unsupported', { message: platform === 'darwin'
      ? 'Mac updates require a signed app. Download new versions from GitHub Releases.'
      : 'Automatic updates are available in the installed Windows application.' });
  } else {
    // Never download/install without direct user consent.
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = true; // Tahoe's current GitHub release channel is beta.
    updater.allowDowngrade = false;
    updater.setFeedURL(GITHUB_PROVIDER);
    updater.on('checking-for-update', () => publish('checking'));
    updater.on('update-available', info =>
      publish('available', { version: String(info.version || ''), percent: 0, message: 'Update available' }));
    updater.on('update-not-available', () =>
      publish('current', { version: '', percent: 0, message: 'PowerSlidePro is up to date.' }));
    updater.on('download-progress', details => {
      publish('downloading', { percent: Math.max(0, Math.min(100, Number(details.percent) || 0)) });
    });
    updater.on('update-downloaded', info =>
      publish('ready', { version: String(info.version || state.version), percent: 100, message: 'Ready to install' }));
    updater.on('error', error =>
      publish('error', { message: 'Update failed: ' + String(error && error.message || error).slice(0, 260) }));
  }
  async function check({ manual = false } = {}) {
    if (!supported || !updater) return { ...state };
    if (busy || ['downloading','ready'].includes(state.phase)) return { ...state };
    busy = true;
    publish('checking', { message: manual ? 'Checking for a newer PowerSlidePro…' : '' });
    try { await updater.checkForUpdates(); }
    catch (error) { publish('error', { message: 'Could not check for updates. Check your connection.' }); }
    finally { busy = false; }
    return { ...state };
  }
  async function download() {
    if (!supported || !updater || state.phase !== 'available') return { ...state };
    publish('downloading', { percent: 0, message: 'Downloading update…' });
    try { await updater.downloadUpdate(); }
    catch (error) { publish('error', { message: 'Download failed. Please try again.' }); }
    return { ...state };
  }
  async function install() {
    if (!supported || !updater || state.phase !== 'ready') return false;
    const parent = getWindow();
    const options = {
      type: 'warning',
      title: 'Install PowerSlidePro Update',
      message: 'Save your presentations before installing',
      detail: 'Installing will close PowerSlidePro. Unsaved edits may be lost. Saved .deckcraft files and your existing presentations will remain on your computer. Windows may request administrator approval.',
      buttons: ['Cancel — Save My Work', 'Restart & Install'],
      defaultId: 0, cancelId: 0, noLink: true
    };
    const result = await dialog.showMessageBox(parent || null, options);
    if (result.response !== 1) return false;
    // Install is explicit: no unattended restart or update-on-quit.
    updater.quitAndInstall(false, true);
    return true;
  }
  function start() {
    if (!supported || !updater || timer) return;
    const initial = setTimeout(() => void check(), 12000);
    timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    timer.unref?.();
    initial.unref?.();
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  return { check, download, install, start, stop, status: () => ({ ...state }), supported, GITHUB_RELEASES };
}
module.exports = { createDesktopUpdater, GITHUB_RELEASES, GITHUB_PROVIDER, CHECK_INTERVAL_MS };
