"""
Clear Path API — Minimal JWT implementation using Python stdlib.
No external dependencies (no python-jose, no PyJWT).
Supports HS256 only — sufficient for this application.
"""

import base64
import hashlib
import hmac
import json
import time
from typing import Any


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.urlsafe_b64decode(s)


def encode(payload: dict[str, Any], secret: str, algorithm: str = "HS256") -> str:
    """Create a JWT token."""
    if algorithm != "HS256":
        raise ValueError("Only HS256 is supported")

    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())

    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{message}.{sig_b64}"


def decode(token: str, secret: str, algorithms: list[str] | None = None) -> dict[str, Any]:
    """Verify and decode a JWT token. Raises ValueError on failure."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token structure")

    header_b64, payload_b64, sig_b64 = parts

    # Verify signature
    message = f"{header_b64}.{payload_b64}"
    expected_sig = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        print(f"DEBUG: JWT Signature mismatch. Secret length: {len(secret)}")
        raise ValueError("Invalid signature")

    # Decode header and verify algorithm
    header = json.loads(_b64url_decode(header_b64))
    if header.get("alg") != "HS256":
        raise ValueError(f"Unsupported algorithm: {header.get('alg')}")

    # Decode payload
    payload = json.loads(_b64url_decode(payload_b64))

    # Check expiration
    exp = payload.get("exp")
    if exp is not None and time.time() > exp:
        raise ValueError("Token has expired")

    return payload
