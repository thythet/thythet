'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('PowerSlideDesktop', Object.freeze({
  save: (data) => ipcRenderer.invoke('pspro:save', data),
  windowAction: (command) => ipcRenderer.send('pspro:window-action', command),
  platform: process.platform
}));
