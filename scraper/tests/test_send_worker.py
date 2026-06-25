"""Tests du worker d'envoi (send_worker.py) — logique pure + dry-run, sans SMTP/Supabase réels."""

from datetime import datetime
from zoneinfo import ZoneInfo

import send_worker as worker

PARIS = ZoneInfo("Europe/Paris")


# --------------------------------------------------------------------------
# Fenêtre d'envoi
# --------------------------------------------------------------------------
def test_fenetre_envoi_lundi_matin_dans_la_fenetre():
    lundi_10h = datetime(2025, 6, 2, 10, 0, tzinfo=PARIS)  # 2025-06-02 est un lundi
    assert worker.dans_fenetre_envoi(None, maintenant=lundi_10h) is True


def test_fenetre_envoi_samedi_hors_fenetre_par_defaut():
    samedi_10h = datetime(2025, 6, 7, 10, 0, tzinfo=PARIS)
    assert worker.dans_fenetre_envoi(None, maintenant=samedi_10h) is False


def test_fenetre_envoi_avant_ouverture():
    lundi_7h = datetime(2025, 6, 2, 7, 0, tzinfo=PARIS)
    assert worker.dans_fenetre_envoi(None, maintenant=lundi_7h) is False


def test_fenetre_envoi_apres_fermeture():
    lundi_19h = datetime(2025, 6, 2, 19, 0, tzinfo=PARIS)
    assert worker.dans_fenetre_envoi(None, maintenant=lundi_19h) is False


def test_fenetre_envoi_personnalisee_weekend_autorise():
    settings = {"weekdays": [6, 7], "send_window_start": "10:00", "send_window_end": "12:00"}
    samedi_11h = datetime(2025, 6, 7, 11, 0, tzinfo=PARIS)
    assert worker.dans_fenetre_envoi(settings, maintenant=samedi_11h) is True


# --------------------------------------------------------------------------
# Configuration SMTP
# --------------------------------------------------------------------------
def _profil_complet(**overrides):
    base = {
        "email_from": "contact@x.fr",
        "smtp_host": "smtp.x.fr",
        "smtp_port": 587,
        "smtp_user": "contact@x.fr",
        "smtp_password_enc": {"iv": "a", "ciphertext": "b", "tag": "c"},
        "daily_limit": 200,
    }
    base.update(overrides)
    return base


def test_smtp_pret_avec_profil_complet():
    assert worker.smtp_pret(_profil_complet()) is True


def test_smtp_pret_faux_si_profil_absent():
    assert worker.smtp_pret(None) is False


def test_smtp_pret_faux_si_mot_de_passe_absent():
    assert worker.smtp_pret(_profil_complet(smtp_password_enc=None)) is False


def test_smtp_pret_faux_si_champ_manquant():
    assert worker.smtp_pret(_profil_complet(smtp_host=None)) is False


# --------------------------------------------------------------------------
# Plafond quotidien effectif
# --------------------------------------------------------------------------
def test_plafond_quotidien_prend_le_plus_bas():
    plafond = worker.calculer_plafond_quotidien(
        {"daily_limit": 150}, {"daily_limit": 50}
    )
    assert plafond == 50


def test_plafond_quotidien_jamais_au_dessus_du_cap_global():
    plafond = worker.calculer_plafond_quotidien({"daily_limit": 9999}, {"daily_limit": 9999})
    assert plafond == 200


def test_plafond_quotidien_sans_campagne_settings():
    plafond = worker.calculer_plafond_quotidien({"daily_limit": 80}, None)
    assert plafond == 80


# --------------------------------------------------------------------------
# Conditions de skip relance
# --------------------------------------------------------------------------
def test_ignore_relance_si_prospect_refuse():
    assert worker.doit_ignorer_relance({"statut": "refuse"}, None) is True


def test_ignore_relance_si_prospect_qualifie():
    assert worker.doit_ignorer_relance({"statut": "qualifie"}, None) is True


def test_ignore_relance_si_message_repondu():
    assert worker.doit_ignorer_relance({"statut": "contacte"}, {"statut": "repondu"}) is True


def test_ignore_relance_si_reponse_detectee():
    assert worker.doit_ignorer_relance({"statut": "contacte"}, {"reply_detected_at": "2025-01-01"}) is True


def test_relance_autorisee_cas_normal():
    assert worker.doit_ignorer_relance({"statut": "contacte"}, {"statut": "envoye"}) is False


# --------------------------------------------------------------------------
# Worker en dry-run : fake Supabase, aucune écriture, aucun envoi SMTP
# --------------------------------------------------------------------------
class _FakeResponse:
    def __init__(self, data=None, count=None):
        self.data = data
        self.count = count


class _FakeQuery:
    def __init__(self, table_name: str, recorder: "_FakeClient", response: _FakeResponse):
        self._table_name = table_name
        self._recorder = recorder
        self._response = response

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def neq(self, *a, **k):
        return self

    def gte(self, *a, **k):
        return self

    def lte(self, *a, **k):
        return self

    def or_(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def maybe_single(self, *a, **k):
        return self

    def insert(self, payload, *a, **k):
        self._recorder.writes.append(("insert", self._table_name, payload))
        return self

    def update(self, payload, *a, **k):
        self._recorder.writes.append(("update", self._table_name, payload))
        return self

    def execute(self):
        return self._response


class _FakeClient:
    """Supabase factice : retourne une réponse canée par table, journalise les écritures."""

    def __init__(self, responses: dict[str, _FakeResponse]):
        self._responses = responses
        self.writes: list[tuple[str, str, dict]] = []

    def table(self, name: str):
        return _FakeQuery(name, self, self._responses.get(name, _FakeResponse(data=[])))


_FENETRE_OUVERTE = {
    "weekdays": [1, 2, 3, 4, 5, 6, 7],
    "send_window_start": "00:00",
    "send_window_end": "23:59",
    "daily_limit": 200,
    "min_delay_seconds": 30,
    "max_delay_seconds": 60,
    "followup_enabled": False,
    "max_followups": 0,
    "followup_delay_days": 4,
}


def test_traiter_messages_dry_run_ne_modifie_rien(monkeypatch):
    message = {
        "id": "msg-1",
        "user_id": "user-1",
        "statut": "en_file",
        "objet": "Sujet",
        "corps": "Corps",
        "campaign_id": "camp-1",
        "campaign": {"id": "camp-1", "statut": "actif"},
        "prospect": {"id": "prospect-1", "email": "p@x.fr", "statut": "a_contacter"},
    }
    client = _FakeClient(
        {
            "messages": _FakeResponse(data=[message]),
            "sender_profiles": _FakeResponse(data=_profil_complet()),
            "campaign_settings": _FakeResponse(data=_FENETRE_OUVERTE),
            "send_logs": _FakeResponse(count=0),
        }
    )

    nb_traites = worker.traiter_messages(
        client,
        limit=10,
        user_id=None,
        dry_run=True,
        profils_cache={},
        mots_de_passe_cache={},
    )

    assert nb_traites == 1
    assert client.writes == []  # dry-run : aucune écriture en base, aucun envoi


def test_traiter_messages_ignore_campagne_non_active():
    message = {
        "id": "msg-1",
        "user_id": "user-1",
        "statut": "en_file",
        "campaign_id": "camp-1",
        "campaign": {"id": "camp-1", "statut": "brouillon"},
        "prospect": {"id": "prospect-1", "email": "p@x.fr"},
    }
    client = _FakeClient({"messages": _FakeResponse(data=[message])})

    nb_traites = worker.traiter_messages(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )
    assert nb_traites == 0


def test_traiter_messages_sans_campagne_est_traite(monkeypatch):
    # Cas `generate-scripts --bucket` (CLI) : pas de campagne associée. Le
    # message ne doit pas être bloqué par le garde-fou "campagne active".
    # (Sans campaign_settings, la fenêtre par défaut s'applique : on la
    # neutralise ici pour que le test soit indépendant de l'heure réelle.)
    monkeypatch.setattr(worker, "dans_fenetre_envoi", lambda settings, maintenant=None: True)

    message = {
        "id": "msg-1",
        "user_id": "user-1",
        "statut": "en_file",
        "objet": "Sujet",
        "corps": "Corps",
        "campaign_id": None,
        "campaign": None,
        "prospect": {"id": "prospect-1", "email": "p@x.fr", "statut": "a_contacter"},
    }
    client = _FakeClient(
        {
            "messages": _FakeResponse(data=[message]),
            "sender_profiles": _FakeResponse(data=_profil_complet()),
            "send_logs": _FakeResponse(count=0),
        }
    )

    nb_traites = worker.traiter_messages(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )
    assert nb_traites == 1


def test_traiter_messages_ignore_prospect_sans_email():
    message = {
        "id": "msg-1",
        "user_id": "user-1",
        "statut": "en_file",
        "campaign_id": "camp-1",
        "campaign": {"id": "camp-1", "statut": "actif"},
        "prospect": {"id": "prospect-1", "email": None},
    }
    client = _FakeClient({"messages": _FakeResponse(data=[message])})

    nb_traites = worker.traiter_messages(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )
    assert nb_traites == 0


def test_traiter_messages_respecte_le_quota_journalier():
    message = {
        "id": "msg-1",
        "user_id": "user-1",
        "statut": "en_file",
        "campaign_id": "camp-1",
        "campaign": {"id": "camp-1", "statut": "actif"},
        "prospect": {"id": "prospect-1", "email": "p@x.fr"},
    }
    client = _FakeClient(
        {
            "messages": _FakeResponse(data=[message]),
            "sender_profiles": _FakeResponse(data=_profil_complet()),
            "campaign_settings": _FakeResponse(data=_FENETRE_OUVERTE),
            "send_logs": _FakeResponse(count=200),  # quota déjà atteint
        }
    )

    nb_traites = worker.traiter_messages(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )
    assert nb_traites == 0


def test_traiter_relances_annule_si_prospect_a_repondu():
    relance = {
        "id": "seq-1",
        "user_id": "user-1",
        "etape": 1,
        "campaign": {"id": "camp-1", "statut": "actif"},
        "prospect": {"id": "prospect-1", "email": "p@x.fr", "statut": "contacte"},
        "message_original": {"statut": "repondu"},
    }
    client = _FakeClient({"sequences": _FakeResponse(data=[relance])})

    nb_traites = worker.traiter_relances(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )

    assert nb_traites == 0
    # dry-run : même l'annulation de relance ne doit pas écrire en base.
    assert client.writes == []


def test_traiter_relances_dry_run_ne_modifie_rien():
    relance = {
        "id": "seq-1",
        "user_id": "user-1",
        "etape": 1,
        "objet": "Re: x",
        "corps": "...",
        "campaign": {"id": "camp-1", "statut": "actif"},
        "prospect": {"id": "prospect-1", "email": "p@x.fr", "statut": "contacte"},
        "message_original": {"statut": "envoye"},
    }
    client = _FakeClient(
        {
            "sequences": _FakeResponse(data=[relance]),
            "sender_profiles": _FakeResponse(data=_profil_complet()),
            "campaign_settings": _FakeResponse(data={**_FENETRE_OUVERTE, "followup_enabled": True, "max_followups": 2}),
            "send_logs": _FakeResponse(count=0),
        }
    )

    nb_traites = worker.traiter_relances(
        client, limit=10, user_id=None, dry_run=True, profils_cache={}, mots_de_passe_cache={}
    )

    assert nb_traites == 1
    assert client.writes == []
