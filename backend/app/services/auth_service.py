"""Authentication and password hashing service for SupportPilot RBAC."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

SECRET_KEY = "supportpilot_secret_key_change_in_production"
ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2:sha256:{iterations}${salt}${derived.hex()}"


def verify_password(password: str, password_hash: str | None) -> bool:
    """Verify raw password against stored hash."""
    if not password_hash:
        return False
    try:
        parts = password_hash.split("$")
        if len(parts) != 3:
            return False
        meta, salt, stored_hash = parts
        iterations = int(meta.split(":")[-1])
        test_derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(test_derived.hex(), stored_hash)
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_in: int = TOKEN_EXPIRY_SECONDS) -> str:
    """Generate signed JWT-like token containing payload."""
    payload = dict(data)
    payload["exp"] = int(time.time()) + expires_in
    header = {"alg": "HS256", "typ": "JWT"}

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode("utf-8")).decode("utf-8").rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    signature_raw = hmac.new(
        SECRET_KEY.encode("utf-8"),
        f"{header_b64}.{payload_b64}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature_raw).decode("utf-8").rstrip("=")
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify access token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        # Verify signature
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(
                SECRET_KEY.encode("utf-8"),
                f"{header_b64}.{payload_b64}".encode("utf-8"),
                hashlib.sha256,
            ).digest()
        ).decode("utf-8").rstrip("=")

        if not hmac.compare_digest(sig_b64, expected_sig):
            return None

        # Pad payload_b64 if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding

        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
