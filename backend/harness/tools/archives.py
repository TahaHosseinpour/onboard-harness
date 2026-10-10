"""Archive tools: look inside .zip, .rar, .7z and .tar files, and unpack them into the workspace.

An archive comes from somewhere else, so unpacking is done defensively:

- every entry must land inside the destination folder (no `..`, no absolute paths, no links)
- there is a ceiling on the number of files and on the total unpacked size, so
  a small archive cannot fill the disk
- nothing already in the workspace is overwritten: the destination must be new or empty
- nothing that is unpacked is ever run

.zip and .tar are read with Python itself. .rar and .7z are read with the
system's `bsdtar` (shipped with Windows 10+ and macOS as `tar`), so no extra
program has to be installed.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tarfile
import uuid
import zipfile
from pathlib import Path, PurePosixPath

from langchain_core.tools import BaseTool, tool

from ..workspace import HARNESS_DIR, Workspace
from .paths import existing_file, inside

MAX_FILES = 5000
MAX_BYTES = 1024 * 1024 * 1024
_TAR_SUFFIXES = (".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tbz2", ".tar.xz", ".txz")
_BSDTAR_SUFFIXES = (".rar", ".7z")
_NO_WINDOW = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0


def _kind(path: Path) -> str:
    name = path.name.lower()
    if name.endswith(".zip"):
        return "zip"
    if name.endswith(_TAR_SUFFIXES):
        return "tar"
    if name.endswith(_BSDTAR_SUFFIXES):
        return "bsdtar"
    raise ValueError("only .zip, .rar, .7z and .tar archives are supported")


def _bsdtar() -> str:
    """The libarchive `tar` that can read .rar and .7z, or an error saying it is missing."""
    if sys.platform == "win32":
        candidate = Path(os.environ.get("SYSTEMROOT", r"C:\Windows")) / "System32" / "tar.exe"
        if candidate.exists():
            return str(candidate)
    found = shutil.which("bsdtar") or (shutil.which("tar") if sys.platform == "darwin" else None)
    if not found:
        raise ValueError("reading .rar and .7z needs the system's bsdtar, which was not found on this machine")
    return found


def _safe_name(name: str) -> str:
    """An entry's path, refused when it would land outside the destination."""
    clean = name.replace("\\", "/")
    parts = PurePosixPath(clean).parts
    if clean.startswith("/") or ".." in parts or (parts and ":" in parts[0]):
        raise ValueError(f"the archive contains an unsafe path: {name!r}")
    return clean


def _entries(file: Path) -> list[tuple[str, int | None]]:
    """(path, size) of every file in the archive. Size is None when the format does not say it cheaply."""
    kind = _kind(file)
    if kind == "zip":
        with zipfile.ZipFile(file) as archive:
            return [(_safe_name(info.filename), info.file_size) for info in archive.infolist() if not info.is_dir()]
    if kind == "tar":
        with tarfile.open(file) as archive:
            return [(_safe_name(member.name), member.size) for member in archive.getmembers() if member.isfile()]
    result = subprocess.run([_bsdtar(), "-tf", str(file)], capture_output=True, timeout=120, check=False, creationflags=_NO_WINDOW)  # noqa: S603
    if result.returncode != 0:
        raise ValueError(_bsdtar_error(result.stderr))
    names = result.stdout.decode("utf-8", errors="replace").splitlines()
    return [(_safe_name(name), None) for name in names if name and not name.endswith("/")]


def _bsdtar_error(stderr: bytes) -> str:
    message = stderr.decode("utf-8", errors="replace").strip().splitlines()
    text = message[-1] if message else "unknown error"
    if "ncrypt" in text or "assword" in text:
        return "this archive is protected with a password"
    return f"the archive could not be read ({text})"


def _unpack(file: Path, target: Path) -> None:
    """Unpack into `target`, an empty folder. Raises ValueError when a limit or a safety rule is broken."""
    kind = _kind(file)
    entries = _entries(file)
    if len(entries) > MAX_FILES:
        raise ValueError(f"the archive holds {len(entries)} files; the limit is {MAX_FILES}")
    if sum(size or 0 for _, size in entries) > MAX_BYTES:
        raise ValueError("the archive unpacks to more than 1 GB")

    if kind == "zip":
        written = 0
        with zipfile.ZipFile(file) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                if info.flag_bits & 0x1:
                    raise ValueError("this archive is protected with a password")
                destination = target / _safe_name(info.filename)
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(info) as source, destination.open("wb") as sink:
                    # Copied in pieces and counted: the size an archive declares cannot be trusted.
                    while chunk := source.read(1024 * 1024):
                        written += len(chunk)
                        if written > MAX_BYTES:
                            raise ValueError("the archive unpacks to more than 1 GB")
                        sink.write(chunk)
    elif kind == "tar":
        with tarfile.open(file) as archive:
            archive.extractall(target, filter="data")  # refuses links and paths that leave the folder
    else:
        result = subprocess.run([_bsdtar(), "-xf", str(file), "-C", str(target)], capture_output=True, timeout=600, check=False, creationflags=_NO_WINDOW)  # noqa: S603
        if result.returncode != 0:
            raise ValueError(_bsdtar_error(result.stderr))
        total = 0
        for item in target.rglob("*"):
            if item.is_symlink():
                raise ValueError("the archive contains links, which are not unpacked")
            if item.is_file():
                total += item.stat().st_size
        if total > MAX_BYTES:
            raise ValueError("the archive unpacks to more than 1 GB")


def make_archive_tools(workspace: Workspace) -> list[BaseTool]:
    @tool
    def list_archive(path: str) -> str:
        """List the files inside a .zip, .rar, .7z or .tar archive in the workspace, without unpacking it."""
        try:
            entries = _entries(existing_file(workspace, path))
        except (ValueError, OSError, zipfile.BadZipFile, tarfile.TarError, subprocess.TimeoutExpired) as error:
            return f"Error: {error}."
        if not entries:
            return "The archive is empty."
        shown = [name + (f"  ({size} bytes)" if size is not None else "") for name, size in entries[:300]]
        more = f"\n… and {len(entries) - 300} more" if len(entries) > 300 else ""
        return f"{len(entries)} files:\n" + "\n".join(shown) + more

    @tool
    def extract_archive(path: str, destination: str | None = None) -> str:
        """Unpack a .zip, .rar, .7z or .tar archive into a folder of the workspace.

        `destination` is the folder to create (default: a folder named after the
        archive, next to it). It must not already contain files: nothing in the
        workspace is overwritten. The unpacked files are only data - read them
        with the other tools; do not run anything that came out of an archive.
        """
        staging = workspace.harness / "artifacts" / f"unpack-{uuid.uuid4().hex[:8]}"
        try:
            file = existing_file(workspace, path)
            _kind(file)
            default = file.name[: -len(".tar.gz")] if file.name.lower().endswith(".tar.gz") else file.stem
            target = inside(workspace, destination) if destination else file.with_name(default)
            if target == workspace.root or HARNESS_DIR in target.relative_to(workspace.root).parts:
                return "Error: choose a folder of its own for the unpacked files."
            if target.exists() and (not target.is_dir() or any(target.iterdir())):
                return f"Error: {workspace.virtual(target)} already exists and is not empty. Choose another destination."
            # Unpacked beside the workspace's own scratch files first, and moved into place only when every check passed.
            staging.mkdir(parents=True)
            _unpack(file, staging)
            count = sum(1 for item in staging.rglob("*") if item.is_file())
            if target.exists():
                target.rmdir()
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(staging), str(target))
        except (ValueError, OSError, zipfile.BadZipFile, tarfile.TarError, subprocess.TimeoutExpired, RuntimeError) as error:
            return f"Error: {error}."
        finally:
            shutil.rmtree(staging, ignore_errors=True)
        return f"Unpacked {count} files into {workspace.virtual(target)}/."

    return [list_archive, extract_archive]
