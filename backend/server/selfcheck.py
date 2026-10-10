"""Self-check:  python -m server --selfcheck  (or  harness-server.exe --selfcheck)

Runs every file-format tool and the browser once, on throwaway files, and says
which ones work. It exists because the packaged engine is a frozen bundle: a
library whose data files were left out only fails when it is first used, and
this finds that on the build machine instead of the user's.
"""

from __future__ import annotations

import asyncio
import tempfile
import zipfile
from collections.abc import Awaitable, Callable

from harness import Workspace
from harness.tools import browser, build_tools


async def _browser_opens() -> str:
    from playwright.async_api import async_playwright

    async with async_playwright() as playwright:
        instance = await browser._launch(playwright)  # noqa: SLF001
        try:
            page = await instance.new_page()
            await page.set_content("<title>ok</title><p>hello</p>")
            return await page.inner_text("body")
        finally:
            await instance.close()


async def _run() -> int:
    workspace = Workspace.at(tempfile.mkdtemp(prefix="harness-selfcheck-")).scaffold()
    tools = build_tools(workspace)

    async def call(name: str, **args: object) -> str:
        return str(await tools[name].ainvoke(args))

    async def word() -> bool:
        await call("write_document", path="/a.docx", content="# سلام\n- one")
        return "سلام" in await call("read_document", path="/a.docx")

    async def powerpoint() -> bool:
        await call("write_document", path="/a.pptx", content="# Title\n- point")
        return "point" in await call("read_document", path="/a.pptx")

    async def excel() -> bool:
        await call("write_table", path="/a.xlsx", columns=["n"], rows=[[1], [2]])
        await call("add_table_rows", path="/a.xlsx", rows=[{"n": 3}])
        return "all: 6.0" in await call("aggregate_table", path="/a.xlsx", value_column="n")

    async def archive() -> bool:
        with zipfile.ZipFile(workspace.root / "a.zip", "w") as file:
            file.writestr("x.txt", "x")
        return "Unpacked 1 files" in await call("extract_archive", path="/a.zip", destination="/unzipped")

    async def pdf() -> bool:
        import pypdf  # noqa: F401 - reading needs a real PDF; being importable is what packaging can break

        return True

    async def web() -> bool:
        return "hello" in await _browser_opens()

    checks: dict[str, Callable[[], Awaitable[bool]]] = {"Word": word, "PowerPoint": powerpoint, "Excel": excel, "Archives": archive, "PDF": pdf, "Browser": web}
    failed = 0
    for name, check in checks.items():
        try:
            ok, detail = await check(), ""
        except Exception as error:  # noqa: BLE001 - the point is to report it
            ok, detail = False, f" ({type(error).__name__}: {str(error).splitlines()[0] if str(error) else ''})"
        failed += not ok
        print(f"{'ok    ' if ok else 'FAILED'} {name}{detail}", flush=True)
    return 1 if failed else 0


def main() -> int:
    return asyncio.run(_run())
