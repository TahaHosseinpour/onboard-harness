// Freezes the Python engine into a self-contained folder:  node scripts/build-engine.cjs
//
// Output: backend/dist/harness-server/harness-server.exe (plus its libraries).
// The desktop build copies that folder into the installer, so the user does not
// need Python on their machine.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.join(__dirname, '..', 'backend');
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

if (!fs.existsSync(python)) {
  console.error('backend/.venv not found. Create it first; see backend/README.md.');
  process.exit(1);
}

// Packages that load parts of themselves by name at run time, which the packager cannot see on its own.
// docx and pptx carry their blank templates as data files; playwright carries the driver that talks to the browser.
const collectAll = ['deepagents', 'langchain', 'langchain_core', 'langgraph', 'langchain_openai', 'langchain_anthropic', 'langsmith', 'wcmatch', 'bracex', 'docx', 'pptx', 'playwright'];
const collectSubmodules = ['keyring', 'uvicorn', 'aiosqlite', 'openpyxl', 'tiktoken_ext', 'pypdf', 'xlrd', 'olefile'];
const metadata = ['deepagents', 'langchain', 'langchain-core', 'langgraph', 'langchain-openai', 'langchain-anthropic', 'keyring', 'openai', 'anthropic', 'pydantic'];
const hidden = ['server.app', 'harness', 'win32ctypes.core', 'keyring.backends.Windows'];

const args = [
  '-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir',
  '--name', 'harness-server',
  '--distpath', 'dist', '--workpath', 'build-engine', '--specpath', 'build-engine',
  ...collectAll.flatMap((name) => ['--collect-all', name]),
  ...collectSubmodules.flatMap((name) => ['--collect-submodules', name]),
  ...metadata.flatMap((name) => ['--copy-metadata', name]),
  ...hidden.flatMap((name) => ['--hidden-import', name]),
  'run_server.py',
];

const result = spawnSync(python, args, { cwd: backend, stdio: 'inherit' });
process.exit(result.status ?? 1);
