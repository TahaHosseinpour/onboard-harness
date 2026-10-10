"""Entry point of the bundled engine (the executable the desktop app starts).

`python -m server` does the same from source; this file exists so the packager
has a single script to freeze.
"""

from server.app import serve

if __name__ == "__main__":
    serve()
