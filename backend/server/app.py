"""The local API: a thin HTTP layer over the harness.

Nothing agentic lives here. Routes translate HTTP into calls on `harness`
(start a run, read a file, list approvals) and translate the answers back.

Run it with:  python -m server
"""

from __future__ import annotations

import os
import secrets
import sys

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import Headers
from starlette.responses import PlainTextResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from .routes import models, runs, workspace
from .state import AppState

# The desktop app and the dev server are the only callers.
_ORIGINS = ["http://localhost:3210", "http://127.0.0.1:3210", "app://harness"]
_HOSTS = {"127.0.0.1", "localhost"}


class LocalOnly:
    """Refuse requests that a web page somewhere else could have caused.

    This API can read and write the user's files and start agents, and a
    browser will happily send requests to localhost on behalf of any site. Two
    checks close that door, with or without a token:

    - `Host` must be this machine. A site that re-points its own domain at
      127.0.0.1 (DNS rebinding) still sends its own name here.
    - `Origin`, when a browser sends one, must be the app itself.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            headers = Headers(scope=scope)
            host = headers.get("host", "").rsplit(":", 1)[0]
            origin = headers.get("origin")
            if host not in _HOSTS or (origin is not None and origin not in _ORIGINS):
                await PlainTextResponse("Forbidden", status_code=403)(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _require_token(request: Request) -> None:
    """Every call must present the token the desktop shell started the engine with.

    The API listens on localhost only, but other programs on the machine can
    reach localhost too; the token keeps them out. It travels in a header only,
    never in the address, so it does not end up in logs.
    """
    expected = os.environ.get("HARNESS_TOKEN")
    if not expected:
        return  # only possible with `--dev`; see `serve`
    if request.url.path.startswith("/files/media/"):
        return  # a media player cannot send headers; the unguessable ticket in the address is checked by the route
    given = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not secrets.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or wrong token.")


def create_app() -> FastAPI:
    # No interactive docs: they would be one more page served from this origin.
    app = FastAPI(title="Onboard Harness", dependencies=[Depends(_require_token)], docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=_ORIGINS, allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(LocalOnly)  # added last, so it runs first
    app.state.harness = AppState()

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    for module in (workspace, models, runs):
        app.include_router(module.router)
    return app


def serve() -> None:
    """Start the API on localhost (port from HARNESS_PORT, default 8765).

    A token is required. `--dev` runs without one, for working on the UI in a
    browser; the `LocalOnly` checks still apply.
    """
    if "--selfcheck" in sys.argv:
        from .selfcheck import main

        sys.exit(main())
    if not os.environ.get("HARNESS_TOKEN"):
        if "--dev" not in sys.argv:
            sys.exit("HARNESS_TOKEN is not set. The desktop app sets it by itself; to run the API alone for development, use:  python -m server --dev")
        print("WARNING: running without a token (--dev). Any program on this machine can use this API.", file=sys.stderr)
    # Localhost only: this API can read and write the user's files.
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("HARNESS_PORT", "8765")), log_level="info")
