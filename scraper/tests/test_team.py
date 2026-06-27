"""Tests de la résolution d'équipe (db/team.py) — Supabase mocké."""

from db.team import resoudre_team_id


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

    def limit(self, *a, **k):
        return self

    def maybe_single(self, *a, **k):
        return self

    def execute(self):
        return self._response


class _FakeClient:
    def __init__(self, response):
        self._response = response

    def table(self, name):
        assert name == "team_members"
        return _FakeQuery(self._response)


def test_resoudre_team_id_trouve():
    client = _FakeClient(_FakeResponse(data={"team_id": "team-1"}))
    assert resoudre_team_id(client, "user-1") == "team-1"


def test_resoudre_team_id_absent():
    client = _FakeClient(_FakeResponse(data=None))
    assert resoudre_team_id(client, "user-1") is None
