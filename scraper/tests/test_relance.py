"""Tests de la génération des relances (models/relance.py) — ton court, non agressif."""

from models.relance import generer_relance


def test_premiere_relance_propose_de_se_desinscrire():
    relance = generer_relance({"denomination": "Le Bon Kebab"}, etape=1, max_followups=2)
    assert "ne vous solliciterai plus" in relance["corps"]
    assert "Re:" in relance["objet"]


def test_derniere_relance_a_un_ton_definitif():
    relance = generer_relance({"denomination": "Le Bon Kebab"}, etape=2, max_followups=2)
    assert "je ne vous relancerai pas davantage" in relance["corps"]
    assert "Dernière relance" in relance["objet"]


def test_relance_courte():
    relance = generer_relance({"denomination": "Le Bon Kebab"}, etape=1, max_followups=3)
    # Volontairement court : pas de re-pitch complet de l'offre initiale.
    assert len(relance["corps"]) < 500


def test_salutation_utilise_prenom_dirigeant():
    relance = generer_relance({"dirigeant": "Ali Yilmaz"}, etape=1, max_followups=2)
    assert relance["corps"].startswith("Bonjour Ali")


def test_relance_utilise_le_profil_expediteur_configure():
    sender = {"prenom": "Léa", "marque": "Léa Web"}
    relance = generer_relance({"denomination": "X"}, etape=1, max_followups=2, sender=sender)
    assert "Léa Web" in relance["corps"]


def test_relance_mention_desinscription_presente():
    relance = generer_relance({"denomination": "X"}, etape=1, max_followups=2)
    assert "stop" in relance["corps"].lower()
