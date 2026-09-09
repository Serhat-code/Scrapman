"""Détection des réponses : extraction des en-têtes et annulation des relances.

Le scénario couvert est celui qui coûtait le plus cher : un prospect répond, et
la relance déjà planifiée part quand même parce que rien n'écrivait
`reply_detected_at`.
"""

from __future__ import annotations

import email
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.reply_check import _referenced_ids, imap_configure, marquer_reponses  # noqa: E402


def _msg(entetes: str) -> Any:
    return email.message_from_string(entetes + "\n\nCorps ignoré.")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
def test_imap_non_configure_si_profil_absent():
    assert imap_configure(None) is False


def test_imap_non_configure_sans_hote():
    assert imap_configure({"smtp_user": "a@b.fr"}) is False


def test_imap_non_configure_sans_utilisateur():
    assert imap_configure({"imap_host": "imap.b.fr"}) is False


def test_imap_configure_quand_les_deux_sont_presents():
    assert imap_configure({"imap_host": "imap.b.fr", "smtp_user": "a@b.fr"}) is True


# ---------------------------------------------------------------------------
# Extraction des en-têtes de corrélation
# ---------------------------------------------------------------------------
def test_in_reply_to_est_extrait_avec_et_sans_chevrons():
    ids = _referenced_ids(_msg("In-Reply-To: <abc@scrapman>"))
    assert "abc@scrapman" in ids
    assert "<abc@scrapman>" in ids


def test_references_multiples_sont_toutes_extraites():
    ids = _referenced_ids(_msg("References: <a@x> <b@x>"))
    assert "<a@x>" in ids
    assert "<b@x>" in ids


def test_les_deux_entetes_sont_consultes():
    """Certains clients ne remplissent que l'un des deux."""
    ids = _referenced_ids(_msg("In-Reply-To: <a@x>\nReferences: <b@x>"))
    assert "<a@x>" in ids and "<b@x>" in ids


def test_aucun_entete_donne_un_ensemble_vide():
    assert _referenced_ids(_msg("Subject: rien")) == set()


# ---------------------------------------------------------------------------
# Marquage en base
# ---------------------------------------------------------------------------
class _FakeQuery:
    def __init__(self, table: str, journal: list, data: list):
        self.table_name = table
        self.journal = journal
        self._data = data
        self.op: dict[str, Any] = {"table": table}

    def select(self, *_a, **_k):
        self.op["action"] = "select"
        return self

    def update(self, payload):
        self.op["action"] = "update"
        self.op["payload"] = payload
        return self

    def eq(self, champ, valeur):
        self.op.setdefault("eq", []).append((champ, valeur))
        return self

    def in_(self, champ, valeurs):
        self.op.setdefault("in", []).append((champ, list(valeurs)))
        return self

    def execute(self):
        self.journal.append(self.op)
        return type("R", (), {"data": self._data})()


class _FakeClient:
    def __init__(self, messages: list):
        self.journal: list = []
        self._messages = messages

    def table(self, nom):
        data = self._messages if nom == "messages" else []
        return _FakeQuery(nom, self.journal, data)


def test_sans_identifiant_aucune_requete():
    client = _FakeClient([])
    assert marquer_reponses(client, "team-1", set()) == 0
    assert client.journal == []


def test_aucun_message_correspondant_ne_declenche_pas_d_ecriture():
    client = _FakeClient([])
    assert marquer_reponses(client, "team-1", {"<a@x>"}) == 0
    assert all(op["action"] == "select" for op in client.journal)


def test_les_messages_sont_marques_repondus():
    client = _FakeClient([{"id": "m1", "provider_message_id": "<a@x>"}])
    assert marquer_reponses(client, "team-1", {"<a@x>"}) == 1

    maj = [o for o in client.journal if o["action"] == "update" and o["table"] == "messages"]
    assert len(maj) == 1
    assert maj[0]["payload"]["statut"] == "repondu"
    assert maj[0]["payload"]["reply_detected_at"]


def test_les_relances_planifiees_sont_annulees():
    """Le cœur du correctif : sans ça la relance partait après la réponse."""
    client = _FakeClient([{"id": "m1", "provider_message_id": "<a@x>"}])
    marquer_reponses(client, "team-1", {"<a@x>"})

    seq = [o for o in client.journal if o["table"] == "sequences"]
    assert len(seq) == 1
    assert seq[0]["payload"] == {"statut": "annule"}
    assert ("original_message_id", ["m1"]) in seq[0]["in"]
    assert ("statut", "planifie") in seq[0]["eq"]


def test_seuls_les_messages_de_l_equipe_sont_touches():
    client = _FakeClient([{"id": "m1", "provider_message_id": "<a@x>"}])
    marquer_reponses(client, "team-1", {"<a@x>"})

    lecture = next(o for o in client.journal if o["action"] == "select")
    assert ("team_id", "team-1") in lecture["eq"]
    # Un message déjà 'repondu' n'a plus rien à apprendre.
    assert ("statut", "envoye") in lecture["eq"]
