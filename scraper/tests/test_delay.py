"""Tests des protections anti-spam (utils/delay.py) — quota et délai, Supabase mocké."""

from utils.delay import DAILY_EMAIL_CAP, delai_anti_spam_secondes, verifier_quota_journalier


class _FakeResponse:
    def __init__(self, count: int) -> None:
        self.count = count
        self.data = None


class _FakeQuery:
    def __init__(self, count: int) -> None:
        self._count = count

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def gte(self, *a, **k):
        return self

    def execute(self):
        return _FakeResponse(self._count)


class _FakeClient:
    def __init__(self, count: int) -> None:
        self._count = count

    def table(self, name: str):
        assert name == "send_logs"
        return _FakeQuery(self._count)


def test_quota_non_atteint():
    peut_envoyer, nb = verifier_quota_journalier("user-1", _FakeClient(50), cap=200)
    assert peut_envoyer is True
    assert nb == 50


def test_quota_atteint():
    peut_envoyer, nb = verifier_quota_journalier("user-1", _FakeClient(200), cap=200)
    assert peut_envoyer is False
    assert nb == 200


def test_cap_personnalise_plus_bas_que_global():
    peut_envoyer, nb = verifier_quota_journalier("user-1", _FakeClient(10), cap=10)
    assert peut_envoyer is False


def test_cap_ne_peut_jamais_depasser_le_plafond_global():
    # Même si on essaie de passer un cap > 200, le plafond global s'applique.
    peut_envoyer, _ = verifier_quota_journalier("user-1", _FakeClient(DAILY_EMAIL_CAP), cap=10_000)
    assert peut_envoyer is False


def test_delai_anti_spam_jamais_sous_30_secondes():
    for _ in range(50):
        delai = delai_anti_spam_secondes(min_seconds=1, max_seconds=5)
        assert delai >= 30


def test_delai_anti_spam_respecte_les_bornes_si_valides():
    for _ in range(50):
        delai = delai_anti_spam_secondes(min_seconds=40, max_seconds=50)
        assert 40 <= delai <= 50
