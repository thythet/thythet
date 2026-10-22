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
  windowAction: (command) => ipcRenderer.send('pspro:window-action', command),
  platform: process.platform
}));
