"""Tests du déchiffrement SMTP (crypto/smtp.py) — compatible avec le chiffrement Node.

On chiffre ici avec la même primitive (AES-256-GCM) que `frontend/src/lib/crypto/smtp.ts`
pour vérifier que le format {iv, ciphertext, tag} stocké par le frontend est bien
déchiffrable côté Python, sans dépendre de Node au moment du test.
"""

import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

import crypto.smtp as smtp_crypto

KEY_HEX = "00" * 32


def _chiffrer(plaintext: str, key_hex: str = KEY_HEX) -> dict:
    key = bytes.fromhex(key_hex)
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext_avec_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext, tag = ciphertext_avec_tag[:-16], ciphertext_avec_tag[-16:]
    return {"iv": iv.hex(), "ciphertext": ciphertext.hex(), "tag": tag.hex()}


def test_dechiffre_un_mot_de_passe_chiffre_au_format_node(monkeypatch):
    monkeypatch.setattr(smtp_crypto, "SMTP_ENCRYPTION_KEY", KEY_HEX)
    enc = _chiffrer("MonMotDePasse123!")
    assert smtp_crypto.decrypt_smtp_password(enc) == "MonMotDePasse123!"


def test_echoue_si_cle_absente(monkeypatch):
    monkeypatch.setattr(smtp_crypto, "SMTP_ENCRYPTION_KEY", "")
    with pytest.raises(smtp_crypto.SmtpDecryptionError):
        smtp_crypto.decrypt_smtp_password({"iv": "00" * 12, "ciphertext": "00" * 16, "tag": "00" * 16})


def test_echoue_si_aucun_mot_de_passe_enregistre(monkeypatch):
    monkeypatch.setattr(smtp_crypto, "SMTP_ENCRYPTION_KEY", KEY_HEX)
    with pytest.raises(smtp_crypto.SmtpDecryptionError):
        smtp_crypto.decrypt_smtp_password(None)


def test_echoue_si_tag_invalide(monkeypatch):
    monkeypatch.setattr(smtp_crypto, "SMTP_ENCRYPTION_KEY", KEY_HEX)
    enc = _chiffrer("secret")
    enc["tag"] = "ff" * 16
    with pytest.raises(smtp_crypto.SmtpDecryptionError):
        smtp_crypto.decrypt_smtp_password(enc)


def test_echoue_si_cle_mauvaise_longueur(monkeypatch):
    monkeypatch.setattr(smtp_crypto, "SMTP_ENCRYPTION_KEY", "00" * 16)
    enc = _chiffrer("secret")
    with pytest.raises(smtp_crypto.SmtpDecryptionError):
        smtp_crypto.decrypt_smtp_password(enc)
