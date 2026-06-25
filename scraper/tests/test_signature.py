"""Tests de la construction de signature (models/signature.py).

Vérifie que le profil expéditeur configuré par l'utilisateur (/settings)
est bien utilisé à la place des valeurs par défaut, et que la mention de
désinscription est toujours présente (obligation même en prospection B2B).
"""

from models.signature import (
    DEFAULT_MARQUE,
    DEFAULT_PRENOM,
    OPT_OUT_MENTION,
    construire_signature,
)


def test_signature_par_defaut_sans_profil():
    signature = construire_signature(None)
    assert DEFAULT_PRENOM in signature
    assert DEFAULT_MARQUE in signature
    assert OPT_OUT_MENTION in signature


def test_signature_utilise_le_profil_configure():
    sender = {"prenom": "Léa", "marque": "Léa Web", "lien_rdv": "calendly.com/lea"}
    signature = construire_signature(sender)
    assert "Léa" in signature
    assert "Léa Web" in signature
    assert "calendly.com/lea" in signature
    assert DEFAULT_PRENOM not in signature


def test_signature_personnalisee_prioritaire():
    sender = {"signature": "L'équipe Acme\nNe pas répondre", "prenom": "Léa"}
    signature = construire_signature(sender)
    assert signature.startswith("L'équipe Acme\nNe pas répondre")
    assert "Léa" not in signature


def test_mention_desinscription_toujours_presente():
    for sender in (None, {}, {"prenom": "Léa"}, {"signature": "Custom"}):
        assert OPT_OUT_MENTION in construire_signature(sender)
