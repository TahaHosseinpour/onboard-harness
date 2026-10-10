// Starts and stops the engine (the Python backend) that does the actual work.
//
// The desktop app owns it: it picks a free port and a one-time token, starts the
// process hidden, and ends it together with the app. The page learns the address
// and token through the preload script, so nothing else on the machine can call it.
const { app } = require('electron');
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

let child = null;
const connection = { url: '', token: '' };

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** How to launch the engine: the bundled executable when packaged, the project's virtualenv in development. */
function command() {
  if (app.isPackaged) {
    const name = process.platform === 'win32' ? 'harness-server.exe' : 'harness-server';
    return { file: path.join(process.resourcesPath, 'backend', name), args: [], cwd: path.join(process.resourcesPath, 'backend') };
  }
  const backend = path.join(__dirname, '..', 'backend');
  const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return { file: python, args: ['-m', 'server'], cwd: backend };
}

async function start() {
  const { file, args, cwd } = command();
  if (!fs.existsSync(file)) {
    console.error(`[engine] not found: ${file}`);
    return connection;
  }
  const port = await freePort();
  connection.url = `http://127.0.0.1:${port}`;
  connection.token = crypto.randomBytes(24).toString('hex');

  const logFile = path.join(app.getPath('userData'), 'engine.log');
  // One previous log is kept; the file never grows without end.
  if (fs.existsSync(logFile) && fs.statSync(logFile).size > 5 * 1024 * 1024) fs.renameSync(logFile, `${logFile}.old`);
  const log = fs.openSync(logFile, 'a');
  child = spawn(file, args, {
    cwd,
    env: { ...process.env, HARNESS_PORT: String(port), HARNESS_TOKEN: connection.token, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.on('exit', (code) => {
    console.error(`[engine] exited with code ${code}`);
    child = null;
  });
  return connection;
}

/** End the engine and anything it started (commands an agent was running). */
function stop() {
  if (!child) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true });
  else child.kill('SIGTERM');
  child = null;
}

module.exports = { start, stop, connection };
