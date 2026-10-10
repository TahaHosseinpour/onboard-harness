// Runs the engine's test suite with the project's virtualenv:  node scripts/test-engine.cjs
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.join(__dirname, '..', 'backend');
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

if (!fs.existsSync(python)) {
  console.error('backend/.venv not found. Create it first; see backend/README.md.');
  process.exit(1);
}

const result = spawnSync(python, ['-m', 'pytest', '-q', ...process.argv.slice(2)], { cwd: backend, stdio: 'inherit' });
process.exit(result.status ?? 1);
