"""Tests de la lecture du plafond d'envoi par plan (db/plans.py) — Supabase mocké."""

from db.plans import recuperer_limite_emails_plan


class _FakeResponse:
    def __init__(self, data=None):
        self.data = data


class _FakeQuery:
    def __init__(self, response):
        self._response = response

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def maybe_single(self, *a, **k):
        return self

    def execute(self):
        return self._response


class _FakeClient:
    def __init__(self, response):
        self._response = response

    def table(self, name):
        assert name == "subscriptions"
        return _FakeQuery(self._response)


def test_recuperer_limite_emails_plan_avec_abonnement_actif():
    client = _FakeClient(_FakeResponse(data={"status": "active", "plans": {"max_emails_jour": 150}}))
    assert recuperer_limite_emails_plan(client, "team-1") == 150


def test_recuperer_limite_emails_plan_sans_abonnement():
    client = _FakeClient(_FakeResponse(data=None))
    assert recuperer_limite_emails_plan(client, "team-1") is None


def test_recuperer_limite_emails_plan_donnee_vide():
    client = _FakeClient(_FakeResponse(data=[]))
    assert recuperer_limite_emails_plan(client, "team-1") is None


def test_recuperer_limite_emails_plan_aucune_ligne_trouvee():
    # Comportement réel de postgrest-py : `.maybe_single().execute()` renvoie
    # `None` directement (pas un objet avec `.data = None`) quand aucun
    # abonnement actif/trialing n'existe pour l'équipe — le cas le plus
    # fréquent (équipe pas encore payante).
    client = _FakeClient(None)
    assert recuperer_limite_emails_plan(client, "team-1") is None
