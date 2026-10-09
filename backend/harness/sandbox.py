"""Execution environment: where commands run, and how far they can reach.

Commands run on the user's own machine, which is what makes local files and
tools usable. That is not a real sandbox, so this module adds the light
isolation that is cheap and portable:

- the working directory is the workspace
- the process gets a minimal environment: no API keys, no tokens, no inherited secrets
- every command has a timeout and an output cap; on timeout or on stop the whole
  process tree is ended, so nothing keeps running in the background
- obviously destructive or system-level commands are refused outright
- commands that name a path outside the workspace are refused

It stops accidents and the common bad idea. It does not stop a determined
program: a script the agent writes can still open any file the user can, and
the network is not restricted. That is why `execute` asks for approval by
default (see `rules.yaml`). For real isolation, replace `GuardedShellBackend`
with a container backend - the rest of the harness does not change.
"""

from __future__ import annotations

import os
import re
import signal
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

from deepagents.backends import CompositeBackend, FilesystemBackend, LocalShellBackend
from deepagents.backends.protocol import BackendProtocol, ExecuteResponse

from .workspace import HARNESS_DIR, Workspace

# Only what a shell needs to find programs and temp space. Everything else is dropped.
_SAFE_ENV = ("PATH", "PATHEXT", "SYSTEMROOT", "SYSTEMDRIVE", "COMSPEC", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE", "LANG", "LC_ALL")

_REFUSED = [
    (r"\b(rm|rmdir|del|erase|rd)\b[^|;&]*\s(-\w*r\w*f?|/s)\b[^|;&]*\s(/|\\|[a-zA-Z]:\\?|~|\*)\s*($|[|;&])", "recursive delete of a root or home folder"),
    (r"\b(format|mkfs|diskpart|fdisk|dd)\b", "disk-level command"),
    (r"\b(shutdown|reboot|halt|poweroff)\b", "shutting the machine down"),
    (r"\b(reg|regedit)\s+(add|delete|import)\b", "editing the registry"),
    (r"\b(sudo|runas|su)\b", "raising privileges"),
    (r"\b(curl|wget|iwr|invoke-webrequest)\b[^|]*\|\s*(sh|bash|zsh|iex|powershell|pwsh|python)\b", "running a script straight from the network"),
    (r"\b(net\s+user|useradd|userdel|passwd)\b", "changing user accounts"),
]
_ABSOLUTE_PATH = re.compile(r"(?<![\w.])(?:[a-zA-Z]:[\\/]|/(?:etc|usr|var|bin|root|home|Users|Windows)\b|~[\\/])[^\s\"'|;&]*")


def _kill_tree(process: subprocess.Popen[str]) -> None:
    """End a command together with everything it started, so nothing is left running."""
    if process.poll() is not None:
        return
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(process.pid)], capture_output=True, check=False, creationflags=subprocess.CREATE_NO_WINDOW)  # noqa: S603, S607
    else:
        os.killpg(os.getpgid(process.pid), signal.SIGKILL)


class GuardedShellBackend(LocalShellBackend):
    """Workspace files plus a shell with the guards described above."""

    def __init__(self, workspace: Workspace, *, timeout: int = 60) -> None:
        self._workspace = workspace
        self._timeout = timeout
        self._max_output = 60_000
        self._running: set[subprocess.Popen[str]] = set()
        self._stopped: set[subprocess.Popen[str]] = set()
        super().__init__(
            root_dir=workspace.root,
            virtual_mode=True,
            timeout=timeout,
            max_output_bytes=self._max_output,
            env={name: os.environ[name] for name in _SAFE_ENV if name in os.environ},
            inherit_env=False,
        )

    def refusal(self, command: str) -> str | None:
        """Why this command may not run, or None when it may."""
        for pattern, reason in _REFUSED:
            if re.search(pattern, command, re.IGNORECASE):
                return reason
        for match in _ABSOLUTE_PATH.finditer(command):
            if not self._workspace.contains(Path(os.path.expanduser(match.group(0)))):
                return f"path outside the workspace: {match.group(0)}"
        if re.search(r"(^|[\s\"'=])\.\.([\\/]|$)", command):
            return "leaving the workspace with '..'"
        return None

    def execute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        reason = self.refusal(command) if isinstance(command, str) and command else "empty command"
        if reason:
            return ExecuteResponse(output=f"Refused: {reason}. Commands must stay inside the workspace.", exit_code=126)

        limit = timeout or self._timeout
        windows = sys.platform == "win32"
        process = subprocess.Popen(  # noqa: S602 - a shell is the point; the guards above are the control
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=self._env,
            cwd=str(self.cwd),
            # Its own process group, so the whole tree can be ended, not just the shell.
            start_new_session=not windows,
            # No console window of its own: the engine runs hidden behind the desktop app.
            creationflags=(subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW) if windows else 0,
        )
        self._running.add(process)
        try:
            output, _ = process.communicate(timeout=limit)
        except subprocess.TimeoutExpired:
            _kill_tree(process)
            output, _ = process.communicate()
            return ExecuteResponse(output=f"Error: timed out after {limit}s and was stopped.\n{output[-2000:]}", exit_code=124)
        finally:
            self._running.discard(process)

        if process in self._stopped:
            self._stopped.discard(process)
            return ExecuteResponse(output="Error: stopped by the user before it finished.", exit_code=130)
        return ExecuteResponse(output=output[: self._max_output], exit_code=process.returncode, truncated=len(output) > self._max_output)

    def kill_all(self) -> None:
        """End every command this backend is running. Called by the stop button."""
        for process in list(self._running):
            self._stopped.add(process)
            _kill_tree(process)


def build_backend(workspace: Workspace, *, allow_shell: bool, on_stop: list[Callable[[], None]] | None = None) -> BackendProtocol:
    """The file backend for a run, with a guarded shell when the policy allows one.

    Without a shell-capable backend deepagents' `execute` tool simply reports
    that execution is unavailable, so "no shell" needs no extra switch.

    Large tool results are parked under `.harness/artifacts/` instead of the
    workspace root, so they do not litter the user's own files.
    """
    files: BackendProtocol = GuardedShellBackend(workspace) if allow_shell else FilesystemBackend(root_dir=workspace.root, virtual_mode=True)
    if isinstance(files, GuardedShellBackend) and on_stop is not None:
        on_stop.append(files.kill_all)  # the stop button also ends running commands
    return CompositeBackend(default=files, routes={}, artifacts_root=f"/{HARNESS_DIR}/artifacts/")
