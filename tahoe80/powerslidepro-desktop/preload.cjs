'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('PowerSlideDesktop', Object.freeze({
  save: (data) => ipcRenderer.invoke('pspro:save', data),
  prepareExport: (payload) => ipcRenderer.invoke('pspro:export-prepare', payload),
  writeExport: (payload) => ipcRenderer.invoke('pspro:export-write', payload),
  finishExport: (requestId) => ipcRenderer.invoke('pspro:export-finish', requestId),
  onSaveAsRequest: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, format) => callback(typeof format === 'string' ? format : '');
    ipcRenderer.on('pspro:save-as-request', listener);
    return () => ipcRenderer.removeListener('pspro:save-as-request', listener);
  },
  readPasteText: () => ipcRenderer.invoke('pspro:paste-text'),
  listPCFonts: () => ipcRenderer.invoke('pspro:list-pc-fonts'),
  readPCFont: family => ipcRenderer.invoke('pspro:read-pc-font', family),
  getUIFont: () => ipcRenderer.invoke('pspro:ui-font-get'),
  setUIFont: family => ipcRenderer.invoke('pspro:ui-font-set', family),
  recentList: () => ipcRenderer.invoke('pspro:recent-list'),
  openRecent: id => ipcRenderer.invoke('pspro:recent-open', id),
  onRecentUpdated: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener=()=>callback();ipcRenderer.on('pspro:recent-updated',listener);
    return ()=>ipcRenderer.removeListener('pspro:recent-updated',listener);
  },
  nextOpenFile: () => ipcRenderer.invoke('pspro:next-open-file'),
  confirmOpenedFile: (id, uid) => ipcRenderer.send('pspro:file-opened', { id, uid }),
  onFileQueued: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('pspro:file-queued', listener);
    return () => ipcRenderer.removeListener('pspro:file-queued', listener);
  },
  updateStatus: () => ipcRenderer.invoke('pspro:update-status'),
  checkUpdate: () => ipcRenderer.invoke('pspro:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('pspro:update-download'),
  installUpdate: () => ipcRenderer.invoke('pspro:update-install'),
  openUpdateRelease: () => ipcRenderer.invoke('pspro:update-release'),
  onUpdateState: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('pspro:update-state',listener);
    return () => ipcRenderer.removeListener('pspro:update-state',listener);
  },
  onUpdateOpen: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('pspro:update-open',listener);
    return () => ipcRenderer.removeListener('pspro:update-open',listener);
  },
  windowAction: (command) => ipcRenderer.send('pspro:window-action', command),
  platform: process.platform
}));
