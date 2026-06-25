"""Tests du scoring algorithmique (models/prospect.py) — zéro IA, déterministe."""

from models.prospect import appliquer_scoring, calculer_score, determiner_angle


def test_pas_de_site_donne_angle_c_et_bonus_visibilite():
    prospect = {"email": None, "telephone": None, "site_url": None}
    score, bucket, details = calculer_score(prospect)

    assert details["pas_de_site"] is True
    assert determiner_angle(details) == "C"
    assert score >= 20


def test_site_non_mobile_donne_angle_a():
    prospect = {"site_url": "https://x.fr", "site_non_mobile": True}
    _, _, details = calculer_score(prospect)
    assert determiner_angle(details) == "A"


def test_site_ok_donne_angle_b():
    prospect = {"site_url": "https://x.fr", "site_non_mobile": False, "site_lent": False}
    _, _, details = calculer_score(prospect)
    assert determiner_angle(details) == "B"


def test_email_nominatif_vaut_plus_que_generique():
    score_nominatif, _, _ = calculer_score({"email": "jean@x.fr", "email_is_generic": False})
    score_generique, _, _ = calculer_score({"email": "contact@x.fr", "email_is_generic": True})
    assert score_nominatif > score_generique


def test_bonus_halal_ajoute_dix_points():
    sans_halal, _, _ = calculer_score({})
    avec_halal, _, _ = calculer_score({"halal_signal": True})
    assert avec_halal == sans_halal + 10


def test_bucket_thresholds():
    # Score 0 -> C, et le score est plafonné à 100.
    score, bucket, _ = calculer_score({})
    assert bucket == "C"
    assert score <= 100


def test_appliquer_scoring_renseigne_tous_les_champs():
    prospect = {"denomination": "Le Kebab d'Or", "site_url": None}
    appliquer_scoring(prospect)

    assert prospect["score"] is not None
    assert prospect["bucket"] in ("A", "B", "C")
    assert prospect["angle"] in ("A", "B", "C")
    assert prospect["raison_principale"]
