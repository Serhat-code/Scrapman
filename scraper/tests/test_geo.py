"""Tests de la résolution ville -> code INSEE (filters/geo.py)."""

import asyncio

from filters.geo import resoudre_code_insee


class _FakeResponse:
    def __init__(self, data: list[dict]) -> None:
        self._data = data

    def raise_for_status(self) -> None:
        return None

    def json(self) -> list[dict]:
        return self._data


class _FakeClient:
    def __init__(self, data: list[dict]) -> None:
        self._data = data

    async def get(self, *_args, **_kwargs):
        return _FakeResponse(self._data)


def test_prefere_la_correspondance_exacte_au_score_de_lapi():
    # Cas réel observé : l'API Geo classe "Marseillette" (697 hab.) avant
    # "Marseille" (886 040 hab.) sur la requête "Marseille".
    data = [
        {"code": "11220", "nom": "Marseillette"},
        {"code": "13055", "nom": "Marseille"},
    ]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Marseille"))
    assert code == "13055"


def test_ignore_les_accents_et_la_casse():
    data = [{"code": "42218", "nom": "Saint-Étienne"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "saint-etienne"))
    assert code == "42218"


def test_retombe_sur_le_premier_resultat_si_aucune_correspondance_exacte():
    data = [{"code": "75056", "nom": "Paris"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Pariss"))
    assert code == "75056"


def test_retourne_none_si_aucun_resultat():
    code = asyncio.run(resoudre_code_insee(_FakeClient([]), "Villeinexistante"))
    assert code is None
