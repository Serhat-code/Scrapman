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


def test_audit_critique_ajoute_vingt_cinq_points():
    sans_audit, _, _ = calculer_score({})
    avec_audit, _, details = calculer_score({"audit_site": {"verdict": "critique"}})
    assert avec_audit == min(sans_audit + 25, 100)
    assert details["audit_critique"] is True


def test_audit_faible_ajoute_quinze_points():
    sans_audit, _, _ = calculer_score({})
    avec_audit, _, details = calculer_score({"audit_site": {"verdict": "faible"}})
    assert avec_audit == min(sans_audit + 15, 100)
    assert details["audit_faible"] is True


def test_audit_moyen_ajoute_cinq_points():
    sans_audit, _, _ = calculer_score({})
    avec_audit, _, details = calculer_score({"audit_site": {"verdict": "moyen"}})
    assert avec_audit == min(sans_audit + 5, 100)
    assert details["audit_moyen"] is True


def test_audit_bon_najoute_aucun_bonus():
    sans_audit, _, _ = calculer_score({})
    avec_audit, _, details = calculer_score({"audit_site": {"verdict": "bon"}})
    assert avec_audit == sans_audit
    assert "audit_critique" not in details
    assert "audit_faible" not in details
    assert "audit_moyen" not in details


def test_score_reste_plafonne_a_cent_avec_bonus_audit():
    prospect = {
        "email": "jean@x.fr", "email_is_generic": False, "telephone": "0600000000",
        "site_url": None, "dirigeant": "Jean Dupont", "adresse": "1 rue x", "ville": "Paris",
        "tranche_effectif": "1 ou 2", "halal_signal": True,
        "audit_site": {"verdict": "critique"},
    }
    score, _, _ = calculer_score(prospect)
    assert score == 100


def test_points_par_categorie_correspondent_au_detail_affiche():
    # Bug réel corrigé : le frontend lisait des clés ("contact",
    # "presence_web"...) qui n'avaient jamais existé dans `details` —
    # toujours affiché à 0 quel que soit le score réel.
    prospect = {
        "email": "jean@x.fr", "email_is_generic": False, "telephone": "0600000000",
        "site_url": "https://x.fr", "site_non_mobile": True,
        "dirigeant": "Jean Dupont", "adresse": "1 rue x", "ville": "Paris",
        "tranche_effectif": "1 ou 2", "halal_signal": True,
    }
    score, _, details = calculer_score(prospect)

    assert details["points_contact"] == 40  # 25 (email nominatif) + 15 (téléphone)
    assert details["points_presence_web"] == 15  # site_non_mobile
    assert details["points_donnees_completes"] == 20  # 10 + 5 + 5
    assert details["points_halal"] == 10
    assert "points_audit" not in details  # pas d'audit fourni
    assert score == details["points_contact"] + details["points_presence_web"] + (
        details["points_donnees_completes"] + details["points_halal"]
    )


def test_points_audit_absent_de_details_sans_audit():
    _, _, details = calculer_score({})
    assert "points_audit" not in details


def test_points_audit_present_meme_a_zero_quand_verdict_bon():
    # Présent (à 0) dès qu'un audit a été réalisé, contrairement à
    # "points_audit absent" quand aucun audit n'a été tenté — permet au
    # frontend de distinguer "pas d'audit" de "audit ok, aucun bonus".
    _, _, details = calculer_score({"audit_site": {"verdict": "bon"}})
    assert details["points_audit"] == 0
