"""Entry point of the bundled engine (the executable the desktop app starts).

`python -m server` does the same from source; this file exists so the packager
has a single script to freeze.
"""

import os

import uvicorn

from server.app import create_app

if __name__ == "__main__":
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("HARNESS_PORT", "8765")), log_level="info")
