"""The local API: a thin HTTP layer over the harness.

Nothing agentic lives here. Routes translate HTTP into calls on `harness`
(start a run, read a file, list approvals) and translate the answers back.

Run it with:  python -m server
"""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .routes import models, runs, workspace
from .state import AppState

# The desktop app and the dev server are the only callers.
_ORIGINS = ["http://localhost:3210", "http://127.0.0.1:3210", "app://harness"]


def _require_token(request: Request) -> None:
    """When the desktop shell sets `HARNESS_TOKEN`, every call must present it.

    The API listens on localhost only, but other programs on the machine can
    reach localhost too; the token keeps them out. EventSource cannot send
    headers, so the token is also accepted as a query parameter.
    """
    expected = os.environ.get("HARNESS_TOKEN")
    if not expected:
        return
    given = request.headers.get("authorization", "").removeprefix("Bearer ").strip() or request.query_params.get("token", "")
    if given != expected:
        raise HTTPException(status_code=401, detail="Missing or wrong token.")


def create_app() -> FastAPI:
    app = FastAPI(title="Onboard Harness", dependencies=[Depends(_require_token)])
    app.add_middleware(CORSMiddleware, allow_origins=_ORIGINS, allow_methods=["*"], allow_headers=["*"])
    app.state.harness = AppState()

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    for module in (workspace, models, runs):
        app.include_router(module.router)
    return app
