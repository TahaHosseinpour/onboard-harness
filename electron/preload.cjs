const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  setTheme: (theme) => ipcRenderer.send('desktop:set-theme', theme),
});
