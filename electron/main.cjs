const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const engine = require('./backend.cjs');

// Dev: the Next dev server. Packaged: the static export served over app://.
const DEV_URL = process.env.DESKTOP_DEV_URL;
const OUT_DIR = path.join(__dirname, '..', 'out');
const APP_ID = 'ir.onboard.harness';
const APP_ORIGIN = 'app://harness';

// Matches --sidebar in globals.css so the native window controls sit on the same tone.
const CHROME = {
  light: { color: '#f4f4fb', symbolColor: '#1b1b29' },
  dark: { color: '#11111a', symbolColor: '#d5d7ea' },
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

// The page may load only its own files, and talk only to the local backend.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Next's static export bootstraps with inline scripts
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:* http://localhost:*",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// One window per user: a second launch focuses the first instead of opening another.
if (!app.requestSingleInstanceLock()) app.quit();

function resolveExport(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl).pathname);
  const base = path.join(OUT_DIR, pathname);
  // Refuse anything that climbs out of the export folder.
  if (!base.startsWith(OUT_DIR)) return null;
  const candidates = [base, `${base}.html`, path.join(base, 'index.html')];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
}

async function serveExport(request) {
  const file = resolveExport(request.url) ?? path.join(OUT_DIR, '404.html');
  try {
    // Read through fs (not file://) so it also works when the app is packed in an asar archive.
    const body = await fs.promises.readFile(file);
    return new Response(body, {
      status: file.endsWith('404.html') ? 404 : 200,
      headers: { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-security-policy': CSP },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function createWindow() {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: app.getName(),
    icon: path.join(__dirname, 'icon.png'), // dev and Linux; on Windows the packaged exe carries its own
    backgroundColor: CHROME[theme].color,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...CHROME[theme], height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Links to the outside world open in the user's browser; the window itself never leaves the app.
  const isInternal = (url) => url.startsWith(APP_ORIGIN) || (DEV_URL && url.startsWith(DEV_URL));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isInternal(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });

  win.loadURL(DEV_URL ?? `${APP_ORIGIN}/`);
  return win;
}

app.setAppUserModelId(APP_ID); // taskbar grouping and notifications on Windows

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(async () => {
  // The app draws its own chrome; the default File/Edit/View menu has no place in it.
  if (app.isPackaged) Menu.setApplicationMenu(null);

  protocol.handle('app', serveExport);

  // The engine starts first so the page knows its address; the page waits for it to answer.
  await engine.start();
  ipcMain.on('desktop:api', (event) => {
    event.returnValue = engine.connection.url ? { ...engine.connection } : null;
  });
  ipcMain.handle('desktop:pick-folder', async (event) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'انتخاب پوشهٔ فضای کاری',
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('desktop:open-path', (_event, target) => shell.openPath(String(target)));

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

app.on('will-quit', () => engine.stop());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
