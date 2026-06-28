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
    # "Marseille" (886 040 hab.) sur la requête "Marseille". Marseille étant
    # une commune à arrondissements, le code 13055 est ensuite développé en
    # liste de codes d'arrondissement (voir test dédié ci-dessous).
    data = [
        {"code": "11220", "nom": "Marseillette"},
        {"code": "13055", "nom": "Marseille"},
    ]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Marseille"))
    assert code == "13201,13202,13203,13204,13205,13206,13207,13208,13209,13210,13211,13212,13213,13214,13215,13216"


def test_ignore_les_accents_et_la_casse():
    data = [{"code": "42218", "nom": "Saint-Étienne"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "saint-etienne"))
    assert code == "42218"


def test_retombe_sur_le_premier_resultat_si_aucune_correspondance_exacte():
    data = [{"code": "01001", "nom": "L'Abergement-Clémenciat"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Abergement-Clemenciatt"))
    assert code == "01001"


def test_retourne_none_si_aucun_resultat():
    code = asyncio.run(resoudre_code_insee(_FakeClient([]), "Villeinexistante"))
    assert code is None


def test_paris_est_developpe_en_20_arrondissements():
    data = [{"code": "75056", "nom": "Paris"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Paris"))
    codes = code.split(",")
    assert len(codes) == 20
    assert codes[0] == "75101"
    assert codes[-1] == "75120"


def test_lyon_est_developpe_en_9_arrondissements():
    data = [{"code": "69123", "nom": "Lyon"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Lyon"))
    codes = code.split(",")
    assert len(codes) == 9
    assert codes[0] == "69381"
    assert codes[-1] == "69389"


def test_ville_normale_nest_pas_affectee():
    data = [{"code": "42218", "nom": "Saint-Étienne"}]
    code = asyncio.run(resoudre_code_insee(_FakeClient(data), "Saint-Étienne"))
    assert code == "42218"
