const { app, BrowserWindow, ipcMain, nativeTheme, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Dev: the Next dev server. Preview/packaged: the static export served over app://.
const DEV_URL = process.env.DESKTOP_DEV_URL;
const OUT_DIR = path.join(__dirname, '..', 'out');

// Matches --sidebar in globals.css so the native window controls sit on the same tone.
const CHROME = {
  light: { color: '#f4f4fb', symbolColor: '#1b1b29' },
  dark: { color: '#11111a', symbolColor: '#d5d7ea' },
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function resolveExport(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl).pathname);
  const base = path.join(OUT_DIR, pathname);
  // Refuse anything that climbs out of the export folder.
  if (!base.startsWith(OUT_DIR)) return null;
  const candidates = [base, `${base}.html`, path.join(base, 'index.html')];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? path.join(OUT_DIR, '404.html');
}

function createWindow() {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: CHROME[theme].color,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...CHROME[theme], height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL(DEV_URL ?? 'app://harness/');
  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const file = resolveExport(request.url);
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 });
  });

  ipcMain.on('desktop:set-theme', (event, theme) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !CHROME[theme]) return;
    nativeTheme.themeSource = theme;
    if (process.platform === 'win32') win.setTitleBarOverlay({ ...CHROME[theme], height: 36 });
    win.setBackgroundColor(CHROME[theme].color);
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
