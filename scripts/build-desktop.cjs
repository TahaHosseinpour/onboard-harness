// Builds the Windows desktop app:  node scripts/build-desktop.cjs
//
// 1. exports the UI as static files (out/)
// 2. stages a minimal app folder (Electron shell + out/) so the installer does
//    not carry the web toolchain in node_modules
// 3. packages it with electron-builder into release/dist/, together with the
//    frozen engine from backend/dist/harness-server (rebuilt by itself when the
//    backend source is newer; pass --engine to force it)
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const stage = path.join(root, 'release', 'app');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** The newest change time under a file or folder, so a stale engine is noticed. */
function newest(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return Math.max(0, ...fs.readdirSync(target).filter((name) => name !== '__pycache__').map((name) => newest(path.join(target, name))));
}

const backend = path.join(root, 'backend');
const engine = path.join(backend, 'dist', 'harness-server', 'harness-server.exe');
const sources = ['harness', 'server', 'run_server.py', 'pyproject.toml'].map((name) => path.join(backend, name));
// The engine is rebuilt when it is missing, when asked for, or when its source changed after it was
// frozen: an installer with a new screen and an old engine fails in ways that are hard to recognise.
const stale = fs.existsSync(engine) && Math.max(...sources.map(newest), newest(path.join(__dirname, 'build-engine.cjs'))) > fs.statSync(engine).mtimeMs;
if (stale) console.log('The engine is older than its source code; rebuilding it.');
if (process.argv.includes('--engine') || !fs.existsSync(engine) || stale) run(process.execPath, [path.join(__dirname, 'build-engine.cjs')]);

run(process.execPath, [nextBin, 'build'], { DESKTOP_EXPORT: '1' });

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(path.join(root, 'electron'), path.join(stage, 'electron'), { recursive: true });
fs.cpSync(path.join(root, 'out'), path.join(stage, 'out'), { recursive: true });
fs.writeFileSync(
  path.join(stage, 'package.json'),
  JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, description: pkg.description, author: 'Taha Hosseinpour', main: pkg.main }, null, 2),
);

const builderCli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
run(process.execPath, [builderCli, '--win', '--config', 'electron-builder.json', '--publish', 'never']);
