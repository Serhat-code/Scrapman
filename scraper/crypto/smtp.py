"""Déchiffrement du mot de passe SMTP (AES-256-GCM).

Miroir Python de `frontend/src/lib/crypto/smtp.ts`. Les deux cotés
(Next.js à l'écriture, ce worker à la lecture) partagent la même clé
`SMTP_ENCRYPTION_KEY` (32 octets hex) : le worker déchiffre directement,
sans dépendre du process Next.js.

Format stocké en base (`sender_profiles.smtp_password_enc`) :
    {"iv": "<hex 12 octets>", "ciphertext": "<hex>", "tag": "<hex 16 octets>"}
"""

from __future__ import annotations

import json

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import SMTP_ENCRYPTION_KEY


class SmtpDecryptionError(RuntimeError):
    """Levée quand le mot de passe SMTP ne peut pas être déchiffré."""


def _get_key() -> bytes:
    if not SMTP_ENCRYPTION_KEY:
        raise SmtpDecryptionError(
            "SMTP_ENCRYPTION_KEY n'est pas configurée dans scraper/.env "
            "(doit être identique à celle utilisée par le frontend)."
        )
    try:
        key = bytes.fromhex(SMTP_ENCRYPTION_KEY)
    except ValueError as exc:
        raise SmtpDecryptionError("SMTP_ENCRYPTION_KEY n'est pas une chaîne hexadécimale valide.") from exc

    if len(key) != 32:
        raise SmtpDecryptionError(
            "SMTP_ENCRYPTION_KEY doit faire 32 octets (64 caractères hexadécimaux)."
        )
    return key


def decrypt_smtp_password(enc: dict[str, str] | str | None) -> str:
    """Déchiffre `smtp_password_enc` ({iv, ciphertext, tag}) et retourne le mot de passe en clair."""
    if not enc:
        raise SmtpDecryptionError("Aucun mot de passe SMTP enregistré pour ce profil.")

    # La colonne est jsonb en schéma, mais peut arriver comme string JSON si la
    # colonne est encore de type text en prod (ADD COLUMN IF NOT EXISTS ne recast pas).
    if isinstance(enc, str):
        try:
            enc = json.loads(enc)
        except json.JSONDecodeError as exc:
            raise SmtpDecryptionError("Format de smtp_password_enc invalide (string non-JSON).") from exc

    try:
        iv = bytes.fromhex(enc["iv"])
        ciphertext = bytes.fromhex(enc["ciphertext"])
        tag = bytes.fromhex(enc["tag"])
    except (KeyError, ValueError) as exc:
        raise SmtpDecryptionError("Format de smtp_password_enc invalide.") from exc

    aesgcm = AESGCM(_get_key())
    try:
        plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    except Exception as exc:  # noqa: BLE001 - toute erreur crypto = échec de déchiffrement
        raise SmtpDecryptionError("Échec du déchiffrement du mot de passe SMTP.") from exc

    return plaintext.decode("utf-8")
