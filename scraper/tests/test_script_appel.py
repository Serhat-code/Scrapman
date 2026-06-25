"""Tests de la génération de scripts d'appel (models/script_appel.py)."""

from models.script_appel import generer_script_appel


def _prospect(**overrides):
    base = {
        "denomination": "Le Bon Kebab",
        "ville": "Saint-Étienne",
        "dirigeant": "Ali Yilmaz",
        "telephone": "0612345678",
        "naf": "5610C",
        "site_non_mobile": None,
        "site_lent": None,
        "score": 72,
        "bucket": "B",
        "angle": "B",
    }
    base.update(overrides)
    return base


def test_valeurs_par_defaut_sans_profil():
    script = generer_script_appel(_prospect())
    assert "Serhat" in script
    assert "développeur web indépendant" in script


def test_utilise_le_profil_expediteur_configure():
    sender = {"prenom": "Léa", "metier": "consultante SEO", "ville": "Lyon", "lien_rdv": "calendly.com/lea"}
    script = generer_script_appel(_prospect(), sender=sender)
    assert "Léa" in script
    assert "consultante SEO" in script
    assert "Lyon" in script
    assert "calendly.com/lea" in script
    assert "Serhat" not in script


def test_infos_prospect_toujours_presentes():
    script = generer_script_appel(_prospect())
    assert "Le Bon Kebab" in script
    assert "0612345678" in script
