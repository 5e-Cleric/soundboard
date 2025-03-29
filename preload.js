// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose ipcRenderer safely to the renderer process
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
  }
});
