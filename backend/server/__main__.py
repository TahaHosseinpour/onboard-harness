"""Start the local API:  python -m server  (port from HARNESS_PORT, default 8765)."""

import os

import uvicorn

from .app import create_app

if __name__ == "__main__":
    # Localhost only: this API can read and write the user's files.
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("HARNESS_PORT", "8765")), log_level="info")
