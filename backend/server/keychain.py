"""API keys live in the operating system's keychain, never in a file.

On Windows that is Credential Manager, on macOS the Keychain. A workspace
folder can be shared or pushed to a repository, so keys must not sit inside it;
settings.json keeps only the model's address and name.
"""

from __future__ import annotations

import keyring
from keyring.errors import KeyringError

_SERVICE = "onboard-harness"


def get_key(model_id: str) -> str:
    try:
        return keyring.get_password(_SERVICE, model_id) or ""
    except KeyringError:
        return ""


def set_key(model_id: str, key: str) -> None:
    keyring.set_password(_SERVICE, model_id, key)


def delete_key(model_id: str) -> None:
    try:
        keyring.delete_password(_SERVICE, model_id)
    except KeyringError:
        pass


def has_key(model_id: str) -> bool:
    return bool(get_key(model_id))
