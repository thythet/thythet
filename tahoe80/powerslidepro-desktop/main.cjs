'use strict';
const { app, BrowserWindow, dialog, ipcMain, session, Menu, shell, clipboard, nativeImage } = require('electron');
const { exportFilters, formatFromPath, suggestedExportName, isImageFormat, isAllSlidesFormat } = require('./export-formats.cjs');
const { createDesktopUpdater, GITHUB_RELEASES } = require('./updater.cjs');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const {createInstalledFontCatalog}=require('./pc-fonts.cjs');
const {createMacFontCatalog}=require('./mac-fonts.cjs');
const installedFonts=process.platform==='darwin'?createMacFontCatalog():createInstalledFontCatalog();
const {createUIFontPreferences}=require('./ui-font-prefs.cjs');
const uiFontPrefs=createUIFontPreferences(()=>path.join(app.getPath('userData'),'tahoe80-ui-font.json'));

const DATA_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar', 'payload')
  : path.join(__dirname, 'payload');
const ALLOWED = ['tahoe80/index.html', 'tahoe80/apps/deckcraft-web/',
  'tahoe80/assets/fonts/', 'tahoe80/assets/js/powerslidepro-present-v1.js',
  'tahoe80/assets/powerslidepro-audience.html',
  'tahoe80/assets/powerslidepro-logo.png', 'tahoe80/data/books/'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};
let server;
let origin;
let mainWindow;
let editorSession;
let desktopUpdater;
const savedPaths = new Map();
const openQueue = [];
const awaitingOpen = new Map();
const pendingExports = new Map();
let exportSequence = 0;
const MAX_EXPORT_BYTES = 180 * 1024 * 1024;
const MAX_OPEN_BYTES = 40 * 1024 * 1024;
let openSequence = 0;
// Only the native launcher and the user-selected Open dialog may enqueue paths.
function queueDeckcraftFile(candidate) {
  if (typeof candidate !== 'string' || path.extname(candidate).toLowerCase() !== '.deckcraft') return false;
  const filePath = path.resolve(candidate);
  if (!openQueue.includes(filePath)) openQueue.push(filePath);
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('pspro:file-queued');
  }
  return true;
}
function queueLaunchArguments(argv) {
  const offset = process.defaultApp ? 2 : 1;
  for (const arg of argv.slice(offset)) {
    if (queueDeckcraftFile(arg)) break;
  }
}
async function openFromFileMenu() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: 'Open PowerSlidePro presentation',
    properties: ['openFile'],
    filters: [{name: 'PowerSlidePro Presentation', extensions: ['deckcraft']}]
  });
  if (!selection.canceled && selection.filePaths.length) queueDeckcraftFile(selection.filePaths[0]);
}
const ownsInstance = app.requestSingleInstanceLock();
if (ownsInstance) queueLaunchArguments(process.argv);
app.on('second-instance', (_event, argv) => {
  if (!ownsInstance) return;
  queueLaunchArguments(argv);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (ownsInstance) queueDeckcraftFile(filePath);
});
const APP_ICON = path.join(__dirname, 'build', 'icon.png');
function aboutPowerSlidePro() {
  const parent = BrowserWindow.getFocusedWindow() || mainWindow;
  void dialog.showMessageBox(parent || undefined, {
    type: 'info', title: 'About PowerSlidePro',
    message: 'PowerSlidePro Desktop',
    detail: 'Version '+app.getVersion()+'\nBuilt and Prepared by Thet\n\nOffline Bible presentations, Khmer typography and slideshow editing.',
    buttons: ['OK'], icon: nativeIcon()
  });
}
function nativeIcon() {
  try { return require('electron').nativeImage.createFromPath(APP_ICON); }
  catch (_) { return undefined; }
}
function showSoftwareUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pspro:update-open');
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}
function publishUpdateStatus(state) {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('pspro:update-state', state);
  }
}
function requestSaveAs(format = '') {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
  mainWindow.webContents.send('pspro:save-as-request', format);
}
function installMenu() {
  const menu = [
    { label: 'File', submenu: [
      { label: 'Open Presentation…', accelerator: 'CmdOrCtrl+O', click: openFromFileMenu },
      { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => requestSaveAs() },
      { label: 'Export', submenu: [
        {label:'PowerPoint (.pptx)…',click:()=>requestSaveAs('pptx')},
        {label:'PDF Document (.pdf)…',click:()=>requestSaveAs('pdf')},
        {type:'separator'},
        {label:'Current Slide as PNG…',click:()=>requestSaveAs('png')},
        {label:'Current Slide as JPEG…',click:()=>requestSaveAs('jpg')},
        {type:'separator'},
        {label:'All Slides as PNG Images…',click:()=>requestSaveAs('png-all')},
        {label:'All Slides as JPEG Images…',click:()=>requestSaveAs('jpg-all')}
      ] },
      { type: 'separator' },
      { role: 'quit', label: 'Exit PowerSlidePro' }
    ] },
    // Native Edit roles are required by Chromium/WebKit to reliably route
    // Cmd+V / Ctrl+V into focused Khmer DOM textareas on both platforms.
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      { role: 'pasteAndMatchStyle' }, { role: 'delete' },
      { type: 'separator' }, { role: 'selectAll' }
    ] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [
      { label: 'Check for Updates…', click: () => {
        showSoftwareUpdate();
        void desktopUpdater?.check({ manual: true });
      } },
      { label: 'Download Latest Release…', click: () => { void shell.openExternal(GITHUB_RELEASES); } },
      { type: 'separator' },
      { label: 'About PowerSlidePro', click: aboutPowerSlidePro }
    ] }
  ];
  if (process.platform === 'darwin') {
    menu.unshift({label: 'PowerSlidePro', submenu: [
      { label: 'About PowerSlidePro', click: aboutPowerSlidePro },
      { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' },
      { type: 'separator' }, { role: 'quit' }
    ]});
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}

function allowedPath(relative) {
  return ALLOWED.some((p) => p.endsWith('/') ? relative.startsWith(p) : relative === p);
}
function respond(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end(); return;
  }
  let relative;
  try {
    relative = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
  } catch {
    res.writeHead(400); res.end(); return;
  }
  if (!allowedPath(relative)) { res.writeHead(404); res.end(); return; }
  const requested = path.resolve(DATA_DIR, relative);
  const delta = path.relative(DATA_DIR, requested);
  if (delta.startsWith('..') || path.isAbsolute(delta)) {
    res.writeHead(403); res.end(); return;
  }
  fs.stat(requested, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(requested).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(requested).on('error', () => res.destroy()).pipe(res);
  });
}
function safeFileName(name) {
  const leaf = path.basename(String(name || 'Presentation').replace(/[\\/]/g, ''))
    .replace(/[<>:"|?*\u0000-\u001f]/g, '_').trim();
  return (leaf.replace(/\.(deckcraft|pptx)$/i, '').slice(0, 90) || 'Presentation') + '.deckcraft';
}
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'PowerSlidePro', width: 1380, height: 860, minWidth: 860, minHeight: 560,
    backgroundColor: '#24262a', show: false,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      partition: 'persist:pspro-editor',
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, backgroundThrottling: false
    }
  });
  // Right-click Paste for real DOM inputs only; do not interfere with the
  // PowerSlidePro canvas editor's own Verse/Chorus/Bridge context menu.
  mainWindow.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable) return;
    const edit = Menu.buildFromTemplate([
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      { type: 'separator' }, { role: 'selectAll' }
    ]);
    edit.popup({ window: mainWindow });
  });
  mainWindow.once('ready-to-show', () => { if (mainWindow) mainWindow.show(); });
  mainWindow.loadURL(origin + '/tahoe80/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.split('?')[0] === origin + '/tahoe80/assets/powerslidepro-audience.html') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: 'PowerSlidePro — Audience',
          width: 1280, height: 720, backgroundColor: '#000',
          webPreferences: {
            sandbox: true, contextIsolation: true, nodeIntegration: false,
            partition: 'persist:pspro-editor',
            webSecurity: true, backgroundThrottling: false
          }
        }
      };
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin + '/tahoe80/')) event.preventDefault();
  });
}

if (ownsInstance) app.whenReady().then(async () => {
  server = http.createServer(respond);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    dialog.showErrorBox('PowerSlidePro startup failed', String(error));
    app.quit(); return;
  }
  origin = 'http://127.0.0.1:' + server.address().port;
  // Sandbox the presentation editor to local resources only. The update client
  // uses Electron's separate default session for HTTPS GitHub Release requests.
  editorSession = session.fromPartition('persist:pspro-editor');
  editorSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    callback({ cancel: !(url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:')) });
  });
  // Download API (PPTX/PDF/image) uses an OS file save dialog.
  editorSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Save PowerSlidePro file', defaultPath: item.getFilename() });
  });
  // Save As: the main process owns the destination path. The renderer only sees
  // a one-time request ID and format, never the destination directory.
  ipcMain.handle('pspro:export-prepare', async (event, payload) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { error: 'Invalid window' };
    const uid = String(payload?.uid || '');
    if (!/^[0-9]{1,20}$/.test(uid)) return { error: 'Invalid presentation' };
    const preferred = typeof payload?.preferred === 'string' ? payload.preferred : '';
    const options = {
      title: 'Save As — PowerSlidePro',
      defaultPath: suggestedExportName(payload?.name, preferred),
      filters: exportFilters
    };
    const result = await dialog.showSaveDialog(mainWindow, options);
    if (result.canceled || !result.filePath) return { cancelled: true };
    const format = formatFromPath(result.filePath);
    if (!format) return { error: 'Choose .deckcraft, .pptx, .pdf, .png, or .jpg' };
    const requested = preferred === 'png-all' || preferred === 'jpg-all';
    const actual = requested && format === preferred.split('-')[0] ? preferred : format;
    const id = String(++exportSequence);
    pendingExports.set(id, { path: result.filePath, format: actual, uid, nextIndex: 0 });
    if (pendingExports.size > 20) pendingExports.delete(pendingExports.keys().next().value);
    return { requestId: id, format: actual, uid };
  });
  ipcMain.handle('pspro:export-write', async (event, payload) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { error: 'Invalid window' };
    const id = String(payload?.requestId || '');
    const rec = pendingExports.get(id);
    if (!rec) return { error: 'Save As request expired' };
    if (payload?.uid !== rec.uid) return { error: 'Presentation changed during export' };
    const data = payload?.data;
    if (typeof data !== 'string' || data.length > MAX_EXPORT_BYTES * 1.34 || !/^[A-Za-z0-9+/=\\r\\n]+$/.test(data))
      return { error: 'Invalid export data' };
    const bytes = Buffer.from(data, 'base64');
    if (!bytes.length || bytes.length > MAX_EXPORT_BYTES) return { error: 'Export is empty or too large' };
    const baseFormat = rec.format.replace('-all', '');
    let output = bytes;
    if (isImageFormat(rec.format)) {
      if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        return { error: 'Invalid rendered image data' };
      if (baseFormat === 'jpg') {
        const img = nativeImage.createFromBuffer(bytes);
        if (img.isEmpty()) return { error: 'Could not convert slide to JPEG' };
        output = img.toJPEG(92);
      }
    } else if (baseFormat === 'pdf') {
      if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return { error: 'Invalid PDF bytes' };
    } else if (baseFormat === 'pptx' || baseFormat === 'deckcraft') {
      if (bytes.subarray(0, 2).toString('ascii') !== 'PK') return { error: 'Invalid presentation archive' };
    }
    let target = rec.path;
    if (isAllSlidesFormat(rec.format)) {
      const index = Number(payload.index);
      if (!Number.isSafeInteger(index) || index !== rec.nextIndex || index >= 500)
        return { error: 'Unexpected image slide sequence' };
      const ext = path.extname(target);
      const stem = path.basename(target, ext);
      target = path.join(path.dirname(target), stem + '-' + String(index + 1).padStart(3, '0') + ext);
      rec.nextIndex++;
    } else pendingExports.delete(id);
    try {
      await fs.promises.writeFile(target, output, {flag: 'w'});
      return { saved: true, count: rec.nextIndex, file: path.basename(target) };
    } catch (error) { pendingExports.delete(id); return { error: String(error) }; }
  });
  ipcMain.handle('pspro:export-finish', (event, requestId) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return false;
    return pendingExports.delete(String(requestId || ''));
  });
  // Load a user-associated file through the existing PowerSlidePro editor.
  // The renderer never supplies a filesystem path; it only asks for a queued file.
  // Clipboard reads are requested only when the user presses Paste inside a
  // generator textbox. Return plain text, never HTML or executable content.
  ipcMain.handle('pspro:paste-text', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return '';
    const value = clipboard.readText('clipboard');
    return typeof value === 'string' ? value.slice(0, 500_000) : '';
  });
  ipcMain.handle('pspro:list-pc-fonts', event => {
    if (!mainWindow || event.sender!==mainWindow.webContents)return [];
    return installedFonts.scan();
  });
  ipcMain.handle('pspro:read-pc-font', async (event, family) => {
    if (!mainWindow || event.sender!==mainWindow.webContents)return null;
    return installedFonts.read(family);
  });
  ipcMain.handle('pspro:ui-font-get', event => {
    if (!['darwin','win32'].includes(process.platform) || !mainWindow || event.sender!==mainWindow.webContents) return 'Default';
    return uiFontPrefs.get();
  });
  ipcMain.handle('pspro:ui-font-set', (event, name) => {
    if (!['darwin','win32'].includes(process.platform) || !mainWindow || event.sender!==mainWindow.webContents) return false;
    return uiFontPrefs.set(name);
  });
  ipcMain.handle('pspro:next-open-file', async (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { error: 'Invalid window' };
    if (!openQueue.length) return null;
    const filePath = openQueue.shift();
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile() || stat.size < 1 || stat.size > MAX_OPEN_BYTES)
        throw new Error('Presentation must be a file smaller than 40 MB');
      const data = await fs.promises.readFile(filePath);
      const id = 'desktop-open:' + (++openSequence);
      awaitingOpen.set(id, filePath);
      if (awaitingOpen.size > 20) awaitingOpen.delete(awaitingOpen.keys().next().value);
      return { id, name: path.basename(filePath), data: data.toString('base64') };
    } catch (error) { return { error: 'Unable to open presentation: ' + String(error) }; }
  });
  ipcMain.on('pspro:file-opened', (event, payload) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
    const id = typeof payload?.id === 'string' ? payload.id : '';
    const uid = typeof payload?.uid === 'string' ? payload.uid : '';
    if (!/^[0-9]{1,20}$/.test(uid) || !awaitingOpen.has(id)) return;
    savedPaths.set(uid, awaitingOpen.get(id));
    awaitingOpen.delete(id);
  });
  ipcMain.handle('pspro:save', async (event, payload) => {
    if (!mainWindow || event.sender !== mainWindow.webContents)
      return { error: 'Invalid window' };
    if (!payload || typeof payload.data !== 'string' || payload.data.length > 120_000_000
      || !/^[A-Za-z0-9+/=\r\n]+$/.test(payload.data))
      return { error: 'Invalid presentation data' };
    const uid = String(payload.uid || '');
    const name = safeFileName(payload.name);
    let target = !payload.saveAs && savedPaths.get(uid);
    if (!target) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PowerSlidePro presentation', defaultPath: name,
        filters: [{ name: 'PowerSlidePro Presentation', extensions: ['deckcraft'] }]
      });
      if (result.canceled || !result.filePath) return { cancelled: true };
      target = result.filePath;
    }
    try {
      const bytes = Buffer.from(payload.data, 'base64');
      if (!bytes.length) throw new Error('Empty presentation');
      await fs.promises.writeFile(target, bytes);
      if (uid) savedPaths.set(uid, target);
      return { saved: true, path: target };
    } catch (error) { return { error: String(error) }; }
  });
  ipcMain.on('pspro:window-action', (event, command) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
    if (command === 'close') mainWindow.close();
    else if (command === 'minimize') mainWindow.minimize();
    else if (command === 'zoom')
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    else if (command === 'fullscreen') mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
  desktopUpdater = createDesktopUpdater({
    app, dialog, platform: process.platform,
    updater: process.platform === 'win32' && app.isPackaged
      ? require('electron-updater').autoUpdater : null,
    getWindow: () => mainWindow,
    notify: publishUpdateStatus
  });
  ipcMain.handle('pspro:update-status', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { phase: 'error', message: 'Invalid window' };
    return desktopUpdater.status();
  });
  ipcMain.handle('pspro:update-check', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { phase: 'error', message: 'Invalid window' };
    return desktopUpdater.check({ manual: true });
  });
  ipcMain.handle('pspro:update-download', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return { phase: 'error', message: 'Invalid window' };
    return desktopUpdater.download();
  });
  ipcMain.handle('pspro:update-install', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return false;
    return desktopUpdater.install();
  });
  ipcMain.handle('pspro:update-release', event => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return false;
    void shell.openExternal(GITHUB_RELEASES);
    return true;
  });
  installMenu();
  createMainWindow();
  desktopUpdater.start();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { desktopUpdater?.stop(); if (server) server.close(); });
