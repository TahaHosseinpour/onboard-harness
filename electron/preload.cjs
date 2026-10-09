const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  // Where the engine listens and the token it expects; decided by the main process at start-up.
  api: ipcRenderer.sendSync('desktop:api'),
  setTheme: (theme) => ipcRenderer.send('desktop:set-theme', theme),
  pickFolder: () => ipcRenderer.invoke('desktop:pick-folder'),
  openPath: (target) => ipcRenderer.invoke('desktop:open-path', target),
});
