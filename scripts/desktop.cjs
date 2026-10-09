// Runs the desktop app without extra tooling.
//   node scripts/desktop.cjs dev      → Next dev server + Electron pointed at it
//   node scripts/desktop.cjs preview  → static export + Electron loading it over app://
const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mode = process.argv[2] ?? 'dev';
const PORT = 3210;
const url = `http://localhost:${PORT}`;
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const electronBin = require('electron');

function waitForServer(retries = 120) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => (left ? setTimeout(() => attempt(left - 1), 500) : reject(new Error('Next dev server did not start'))));
    };
    attempt(retries);
  });
}

function launchElectron(env) {
  const childEnv = { ...process.env, ...env };
  // Terminals spawned by Electron-based editors export this, which makes Electron boot as plain Node.
  delete childEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronBin, ['.'], { cwd: root, stdio: 'inherit', env: childEnv });
  return new Promise((resolve) => child.on('exit', resolve));
}

async function main() {
  if (mode === 'preview') {
    const build = spawnSync(process.execPath, [nextBin, 'build'], { cwd: root, stdio: 'inherit', env: { ...process.env, DESKTOP_EXPORT: '1' } });
    if (build.status !== 0) process.exit(build.status ?? 1);
    await launchElectron({});
    return;
  }

  const next = spawn(process.execPath, [nextBin, 'dev', '-p', String(PORT)], { cwd: root, stdio: 'inherit' });
  const stop = () => next.kill();
  process.on('SIGINT', stop);
  process.on('exit', stop);
  await waitForServer();
  await launchElectron({ DESKTOP_DEV_URL: url });
  stop();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
