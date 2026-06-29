"""Tests de la dérivation site_lent/site_non_mobile depuis l'audit PageSpeed
(scrapers/website.py) — Playwright et l'appel réseau PageSpeed sont mockés.
"""

import asyncio

import scrapers.website as website


def _patch_sans_attente(monkeypatch):
    # Évite un vrai sleep(0.5) dans les tests.
    monkeypatch.setattr(website, "DELAI_APRES_AUDIT_SECONDES", 0)


async def _fake_analyser_site(browser, url):
    return {"email": None, "email_is_generic": None, "telephone": None, "reseaux_sociaux": None}


def test_site_lent_et_non_mobile_derives_de_laudit_quand_mauvais(monkeypatch):
    monkeypatch.setenv("GOOGLE_PAGESPEED_API_KEY", "cle")
    monkeypatch.setattr(website, "analyser_site", _fake_analyser_site)
    monkeypatch.setattr(
        website,
        "auditer_site",
        lambda url, key: {"perf": 30, "accessibilite": 80, "verdict": "faible"},
    )
    _patch_sans_attente(monkeypatch)

    resultat = asyncio.run(
        website.enrichir_site_prospect({"site_url": "https://x.fr"}, client=None, browser=None)
    )
    assert resultat["site_lent"] is True
    assert resultat["site_non_mobile"] is False
    assert resultat["audit_site"]["verdict"] == "faible"


def test_site_lent_et_non_mobile_false_quand_audit_bon(monkeypatch):
    monkeypatch.setenv("GOOGLE_PAGESPEED_API_KEY", "cle")
    monkeypatch.setattr(website, "analyser_site", _fake_analyser_site)
    monkeypatch.setattr(
        website,
        "auditer_site",
        lambda url, key: {"perf": 95, "accessibilite": 90, "verdict": "bon"},
    )
    _patch_sans_attente(monkeypatch)

    resultat = asyncio.run(
        website.enrichir_site_prospect({"site_url": "https://x.fr"}, client=None, browser=None)
    )
    assert resultat["site_lent"] is False
    assert resultat["site_non_mobile"] is False


def test_site_lent_et_non_mobile_none_sans_cle_api(monkeypatch):
    monkeypatch.delenv("GOOGLE_PAGESPEED_API_KEY", raising=False)
    monkeypatch.setattr(website, "analyser_site", _fake_analyser_site)

    resultat = asyncio.run(
        website.enrichir_site_prospect({"site_url": "https://x.fr"}, client=None, browser=None)
    )
    assert resultat["site_lent"] is None
    assert resultat["site_non_mobile"] is None
    assert resultat["audit_site"] is None


def test_site_lent_et_non_mobile_none_quand_audit_echoue(monkeypatch):
    monkeypatch.setenv("GOOGLE_PAGESPEED_API_KEY", "cle")
    monkeypatch.setattr(website, "analyser_site", _fake_analyser_site)
    monkeypatch.setattr(website, "auditer_site", lambda url, key: None)
    _patch_sans_attente(monkeypatch)

    resultat = asyncio.run(
        website.enrichir_site_prospect({"site_url": "https://x.fr"}, client=None, browser=None)
    )
    assert resultat["site_lent"] is None
    assert resultat["site_non_mobile"] is None
