"""Tests de la sélection d'établissement (scrapers/recherche_entreprises.py)."""

from scrapers.recherche_entreprises import _selectionner_etablissement


def test_selectionne_letablissement_dans_la_liste_de_codes_commune():
    # code_commune peut contenir plusieurs arrondissements séparés par des
    # virgules (Paris/Lyon/Marseille, voir filters/geo.py) — l'établissement
    # doit être retrouvé même s'il ne correspond qu'à l'un des codes.
    result = {
        "siege": {"commune": "75108", "siret": "siege"},
        "matching_etablissements": [
            {"commune": "13201", "etat_administratif": "A", "siret": "autre_ville"},
            {"commune": "75108", "etat_administratif": "A", "siret": "bon_etablissement"},
        ],
    }
    etab = _selectionner_etablissement(result, "75101,75102,75108,75120")
    assert etab is not None
    assert etab["siret"] == "bon_etablissement"


def test_retombe_sur_le_siege_si_dans_la_liste_de_codes():
    result = {"siege": {"commune": "69383", "siret": "siege_lyon"}, "matching_etablissements": []}
    etab = _selectionner_etablissement(result, "69381,69382,69383")
    assert etab is not None
    assert etab["siret"] == "siege_lyon"


def test_ignore_le_resultat_si_aucun_etablissement_dans_la_zone_demandee():
    # Bug réel observé : une chaîne avec siège à Neuilly-sur-Seine et des
    # succursales hors de la zone demandée se voyait attribuer son siège
    # (mauvaise ville) au lieu d'être ignorée.
    result = {
        "siege": {"commune": "92051", "siret": "siege_neuilly"},
        "matching_etablissements": [
            {"commune": "82000", "etat_administratif": "A", "siret": "succursale_montauban"},
        ],
    }
    etab = _selectionner_etablissement(result, "13201,13202,13203")
    assert etab is None
