'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('PowerSlideDesktop', Object.freeze({
  save: (data) => ipcRenderer.invoke('pspro:save', data),
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
