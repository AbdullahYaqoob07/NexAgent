"""
Credentials API — save, list, and delete encrypted user credentials.

Encryption: Fernet (AES-128-CBC + HMAC-SHA256)
Key:        CREDENTIALS_ENCRYPTION_KEY env var (generate with Fernet.generate_key())

Firestore path: users/{uid}/credentials/{name}
Document fields: name, encryptedValue, hint, createdAt
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import firestore as fs_admin
from pydantic import BaseModel
from cryptography.fernet import Fernet, InvalidToken

from app.services.firebase_service import firebase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credentials", tags=["Credentials"])
security = HTTPBearer()


# ── Encryption helpers ────────────────────────────────────────────────────────

def _get_cipher() -> Fernet:
    key = os.environ.get("CREDENTIALS_ENCRYPTION_KEY", "").strip()
    if not key:
        # Generate a stable default for dev — warn loudly in production
        logger.warning(
            "CREDENTIALS_ENCRYPTION_KEY not set! Using a temporary dev key. "
            "Set this env var before deploying to production."
        )
        # Use a fixed dev key so restarts don't invalidate saved creds during dev
        key = "ZmDfcTF7_60GrrY167zsiPd67yx9dVHbpVihHrHHVPs="
    return Fernet(key.encode())


def _encrypt(plaintext: str) -> str:
    return _get_cipher().encrypt(plaintext.encode()).decode()


def _decrypt(ciphertext: str) -> str:
    return _get_cipher().decrypt(ciphertext.encode()).decode()


def _hint(value: str) -> str:
    """Mask all but the last 4 chars for display."""
    if len(value) <= 4:
        return "••••"
    return "••••" + value[-4:]


def _normalize_name(name: str) -> str:
    """Convert 'My Stripe Key' → 'my_stripe_key' for consistent lookup."""
    return name.strip().lower().replace(" ", "_").replace("-", "_")


# ── Auth dependency ───────────────────────────────────────────────────────────

async def _get_uid(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        decoded = await firebase_service.verify_token(creds.credentials)
        if not decoded:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return decoded["uid"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ── Pydantic models ───────────────────────────────────────────────────────────

class CredentialCreate(BaseModel):
    name: str       # human-readable label, e.g. "My Stripe Key"
    value: str      # plaintext secret value


class CredentialItem(BaseModel):
    name: str       # normalised key used in {{$creds.name}}
    label: str      # original human-readable label
    hint: str       # e.g. "••••X1AB"
    createdAt: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[CredentialItem])
async def list_credentials(uid: str = Depends(_get_uid)):
    """List all credential names + hints for the authenticated user (never plaintext)."""
    try:
        col = firebase_service.db.collection("users").document(uid).collection("credentials")
        items: list[CredentialItem] = []
        for doc in col.stream():
            data = doc.to_dict() or {}
            items.append(CredentialItem(
                name=data.get("name", doc.id),
                label=data.get("label", data.get("name", doc.id)),
                hint=data.get("hint", "••••"),
                createdAt=str(data.get("createdAt", "")),
            ))
        return items
    except Exception as exc:
        logger.error("list_credentials failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Failed to load credentials")


@router.post("", response_model=CredentialItem, status_code=status.HTTP_201_CREATED)
async def save_credential(body: CredentialCreate, uid: str = Depends(_get_uid)):
    """Save (or overwrite) a named credential. Value is AES-encrypted before storage."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not body.value.strip():
        raise HTTPException(status_code=400, detail="Value is required")

    try:
        name = _normalize_name(body.name)
        encrypted = _encrypt(body.value.strip())
        hint = _hint(body.value.strip())

        doc_ref = (
            firebase_service.db
            .collection("users").document(uid)
            .collection("credentials").document(name)
        )
        doc_ref.set({
            "name": name,
            "label": body.name.strip(),
            "encryptedValue": encrypted,
            "hint": hint,
            "createdAt": fs_admin.SERVER_TIMESTAMP,
        })
        return CredentialItem(name=name, label=body.name.strip(), hint=hint)
    except Exception as exc:
        logger.error("save_credential failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Failed to save credential")


@router.delete("/{name}", status_code=status.HTTP_200_OK)
async def delete_credential(name: str, uid: str = Depends(_get_uid)):
    """Delete a credential by normalised name."""
    try:
        (
            firebase_service.db
            .collection("users").document(uid)
            .collection("credentials").document(_normalize_name(name))
            .delete()
        )
        return {"success": True}
    except Exception as exc:
        logger.error("delete_credential failed for %s/%s: %s", uid, name, exc)
        raise HTTPException(status_code=500, detail="Failed to delete credential")


# ── Internal helper used by the workflow engine ───────────────────────────────

def load_user_credentials_sync(uid: str) -> dict[str, str]:
    """
    Synchronously load and decrypt all credentials for a user.
    Called inside the workflow engine before execution starts.
    Returns: { "my_stripe_key": "sk_live_xxx", ... }
    """
    try:
        cipher = _get_cipher()
        col = (
            firebase_service.db
            .collection("users").document(uid)
            .collection("credentials")
        )
        result: dict[str, str] = {}
        for doc in col.stream():
            data = doc.to_dict() or {}
            try:
                decrypted = cipher.decrypt(data["encryptedValue"].encode()).decode()
                result[data.get("name", doc.id)] = decrypted
            except (InvalidToken, KeyError, Exception) as e:
                logger.warning("Skipping unreadable credential %s/%s: %s", uid, doc.id, e)
        return result
    except Exception as exc:
        logger.error("load_user_credentials_sync failed for %s: %s", uid, exc)
        return {}
