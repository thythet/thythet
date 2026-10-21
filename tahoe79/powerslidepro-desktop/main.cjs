'use strict';
const { app, BrowserWindow, dialog, ipcMain, session, Menu } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const DATA_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar', 'payload')
  : path.join(__dirname, 'payload');
const ALLOWED = ['tahoe79/index.html', 'tahoe79/apps/deckcraft-web/',
  'tahoe79/assets/fonts/', 'tahoe79/assets/js/powerslidepro-present-v1.js',
  'tahoe79/assets/powerslidepro-audience.html',
  'tahoe79/assets/powerslidepro-logo.png', 'tahoe79/data/books/'];
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
const savedPaths = new Map();
const APP_ICON = path.join(__dirname, 'build', 'icon.png');
function aboutPowerSlidePro() {
  const parent = BrowserWindow.getFocusedWindow() || mainWindow;
  void dialog.showMessageBox(parent || undefined, {
    type: 'info', title: 'About PowerSlidePro',
    message: 'PowerSlidePro Desktop',
    detail: 'Version 0.1.1\nBuilt and Prepared by Thet\n\nOffline Bible presentations, Khmer typography and slideshow editing.',
    buttons: ['OK'], icon: nativeIcon()
  });
}
function nativeIcon() {
  try { return require('electron').nativeImage.createFromPath(APP_ICON); }
  catch (_) { return undefined; }
}
function installMenu() {
  const menu = [
    { label: 'File', submenu: [{ role: 'quit', label: 'Exit PowerSlidePro' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [{ label: 'About PowerSlidePro', click: aboutPowerSlidePro }] }
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
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, backgroundThrottling: false
    }
  });
  mainWindow.once('ready-to-show', () => { if (mainWindow) mainWindow.show(); });
  mainWindow.loadURL(origin + '/tahoe79/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.split('?')[0] === origin + '/tahoe79/assets/powerslidepro-audience.html') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: 'PowerSlidePro — Audience',
          width: 1280, height: 720, backgroundColor: '#000',
          webPreferences: {
            sandbox: true, contextIsolation: true, nodeIntegration: false,
            webSecurity: true, backgroundThrottling: false
          }
        }
      };
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin + '/tahoe79/')) event.preventDefault();
  });
}

app.whenReady().then(async () => {
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
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    callback({ cancel: !(url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:')) });
  });
  // Download API (PPTX/PDF/image) uses an OS file save dialog.
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Save PowerSlidePro file', defaultPath: item.getFilename() });
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
  installMenu();
  createMainWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
