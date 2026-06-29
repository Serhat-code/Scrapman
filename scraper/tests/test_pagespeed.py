"""Tests de l'audit PageSpeed Insights (audit/pagespeed.py) — httpx mocké."""

import httpx

from audit.pagespeed import auditer_site

_REQUEST = httpx.Request("GET", "https://www.googleapis.com/pagespeedonline/v5/runPagespeed")


def _reponse(status_code: int, json_body: dict) -> httpx.Response:
    return httpx.Response(status_code, json=json_body, request=_REQUEST)


def _reponse_lighthouse(*, perf: float, seo: float, accessibilite: float, fcp_ms: float, lcp_ms: float) -> dict:
    return {
        "lighthouseResult": {
            "categories": {
                "performance": {"score": perf},
                "seo": {"score": seo},
                "accessibility": {"score": accessibilite},
            },
            "audits": {
                "first-contentful-paint": {"numericValue": fcp_ms},
                "largest-contentful-paint": {"numericValue": lcp_ms},
            },
        }
    }


def test_retourne_none_sans_url():
    assert auditer_site(None, "cle") is None
    assert auditer_site("", "cle") is None


def test_retourne_none_sans_cle_api():
    assert auditer_site("https://x.fr", "") is None


def test_audit_site_bon(monkeypatch):
    payload = _reponse_lighthouse(perf=0.95, seo=0.92, accessibilite=0.90, fcp_ms=800, lcp_ms=1200)
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(200, payload))

    audit = auditer_site("https://x.fr", "cle")
    assert audit is not None
    assert audit["perf"] == 95
    assert audit["seo"] == 92
    assert audit["accessibilite"] == 90
    assert audit["fcp_ms"] == 800
    assert audit["lcp_ms"] == 1200
    assert audit["verdict"] == "bon"
    assert audit["problemes"] == []


def test_audit_site_critique_liste_les_problemes(monkeypatch):
    payload = _reponse_lighthouse(perf=0.10, seo=0.20, accessibilite=0.15, fcp_ms=6000, lcp_ms=9000)
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(200, payload))

    audit = auditer_site("https://x.fr", "cle")
    assert audit is not None
    assert audit["verdict"] == "critique"
    assert len(audit["problemes"]) == 3  # plafonné à 3 même si 4 critères matchent
    assert any("lent" in p.lower() for p in audit["problemes"])


def test_calcul_score_global_pondere(monkeypatch):
    # perf*0.5 + seo*0.3 + accessibilite*0.2 = 80*0.5 + 60*0.3 + 40*0.2 = 40+18+8 = 66
    payload = _reponse_lighthouse(perf=0.80, seo=0.60, accessibilite=0.40, fcp_ms=1000, lcp_ms=2000)
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(200, payload))

    audit = auditer_site("https://x.fr", "cle")
    assert audit["score_global"] == 66
    assert audit["verdict"] == "moyen"


def test_retourne_none_sur_timeout(monkeypatch):
    def _raise(*a, **k):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(httpx, "get", _raise)
    assert auditer_site("https://x.fr", "cle") is None


def test_retourne_none_sur_quota_depasse_429(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(429, {"error": "quota"}))
    assert auditer_site("https://x.fr", "cle") is None


def test_retourne_none_sur_reponse_inattendue(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(200, {"inattendu": True}))
    assert auditer_site("https://x.fr", "cle") is None


def test_lcp_au_dela_du_seuil_ajoute_un_probleme_meme_si_scores_corrects(monkeypatch):
    payload = _reponse_lighthouse(perf=0.90, seo=0.90, accessibilite=0.90, fcp_ms=1000, lcp_ms=5000)
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _reponse(200, payload))

    audit = auditer_site("https://x.fr", "cle")
    assert audit["verdict"] == "bon"
    assert any("5000" in p for p in audit["problemes"])
