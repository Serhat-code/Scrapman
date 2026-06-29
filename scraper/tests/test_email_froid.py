"""Tests de la génération d'emails froids (models/email_froid.py) — 100% templates."""

from models.email_froid import generer_email_froid


def _prospect(**overrides):
    base = {
        "denomination": "Le Bon Kebab",
        "ville": "Saint-Étienne",
        "dirigeant": "Ali Yilmaz",
        "naf": "5610C",
        "site_url": None,
        "site_non_mobile": None,
        "site_lent": None,
        "angle": "B",
        "reseaux_sociaux": None,
    }
    base.update(overrides)
    return base


def test_angle_c_mentionne_absence_de_site():
    email = generer_email_froid(_prospect(angle="C"))
    assert "Le Bon Kebab" in email["corps"]
    assert "n'a pas encore de site internet" in email["corps"]


def test_angle_a_site_non_mobile():
    email = generer_email_froid(_prospect(angle="A", site_url="https://x.fr", site_non_mobile=True))
    assert "mobile" in email["corps"]


def test_angle_b_mentionne_secteur_et_ville():
    email = generer_email_froid(_prospect(angle="B"))
    assert "Saint-Étienne" in email["objet"]


def test_salutation_utilise_prenom_dirigeant():
    email = generer_email_froid(_prospect(dirigeant="Fatima Demir"))
    assert email["corps"].startswith("Bonjour Fatima")


def test_sans_dirigeant_salutation_generique():
    email = generer_email_froid(_prospect(dirigeant=None))
    assert email["corps"].startswith("Bonjour,")


def test_signal_instagram_ajoute_phrase_valorisante():
    email = generer_email_froid(_prospect(reseaux_sociaux={"instagram": "https://instagram.com/x"}))
    assert "Instagram" in email["corps"]


def test_angle_inconnu_retombe_sur_b():
    email = generer_email_froid(_prospect(angle=None))
    # Angle par défaut B : objet basé sur le secteur + ville.
    assert "Saint-Étienne" in email["objet"]


def test_signature_par_defaut_si_aucun_profil():
    email = generer_email_froid(_prospect())
    assert "Serhat" in email["corps"]
    assert "Atlamaz Studio" in email["corps"]


def test_utilise_le_profil_expediteur_configure():
    sender = {"prenom": "Léa", "marque": "Léa Web", "lien_rdv": "calendly.com/lea"}
    email = generer_email_froid(_prospect(), sender=sender)
    assert "Léa Web" in email["corps"]
    assert "calendly.com/lea" in email["corps"]
    assert "Serhat" not in email["corps"]


def test_mention_desinscription_presente():
    email = generer_email_froid(_prospect())
    assert "stop" in email["corps"].lower()


def test_angle_a_avec_audit_critique_cite_les_vrais_chiffres():
    email = generer_email_froid(
        _prospect(
            angle="A",
            site_url="https://x.fr",
            site_lent=True,
            audit_site={"verdict": "critique", "perf": 12, "fcp_ms": 5200},
        )
    )
    assert "5200ms" in email["corps"]
    assert "12/100" in email["corps"]
    assert "PageSpeed" in email["corps"]


def test_angle_a_avec_audit_bon_retombe_sur_lheuristique_locale():
    email = generer_email_froid(
        _prospect(
            angle="A",
            site_url="https://x.fr",
            site_lent=True,
            audit_site={"verdict": "bon", "perf": 95, "fcp_ms": 800},
        )
    )
    assert "PageSpeed" not in email["corps"]
    assert "met du temps à s'afficher" in email["corps"]


def test_angle_a_sans_audit_retombe_sur_lheuristique_locale():
    email = generer_email_froid(_prospect(angle="A", site_url="https://x.fr", site_non_mobile=True))
    assert "PageSpeed" not in email["corps"]
    assert "mobile" in email["corps"]
