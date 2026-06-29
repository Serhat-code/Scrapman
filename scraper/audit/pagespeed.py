"""Audit technique d'un site via Google PageSpeed Insights API (gratuit, quota quotidien).

Vient compléter l'heuristique locale Playwright (`site_lent`/`site_non_mobile`,
voir `scrapers/website.py`) par de vrais chiffres Lighthouse (performance, SEO,
accessibilité mobile, FCP, LCP) — utilisés pour préciser le pitch commercial et
affiner le scoring. Entièrement optionnel : sans clé API ou en cas d'échec,
l'appelant continue normalement sans audit (voir `auditer_site`).
"""

from __future__ import annotations

import httpx

PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

# Au-delà de ce délai d'affichage du contenu principal (ms), même un score
# Lighthouse correct ne reflète pas un ressenti utilisateur acceptable.
SEUIL_LCP_MS = 4000


def _verdict(score_global: float) -> str:
    """Catégorise le score global (0-100) en verdict lisible pour le pitch."""
    if score_global < 30:
        return "critique"
    if score_global < 50:
        return "faible"
    if score_global < 70:
        return "moyen"
    return "bon"


def _problemes(
    perf: int, seo: int, accessibilite: int, fcp_ms: int | None, lcp_ms: int | None
) -> list[str]:
    """Liste (max 3) des problèmes concrets détectés, prêts à citer dans un email."""
    problemes: list[str] = []
    if perf < 50:
        problemes.append(f"Site lent : {fcp_ms}ms de chargement sur mobile")
    if seo < 50:
        problemes.append(f"Mauvais référencement technique (score {seo}/100)")
    if accessibilite < 50:
        problemes.append(f"Non optimisé mobile (score {accessibilite}/100)")
    if lcp_ms is not None and lcp_ms > SEUIL_LCP_MS:
        problemes.append(f"Temps d'affichage principal trop long ({lcp_ms}ms)")
    return problemes[:3]


def auditer_site(url: str | None, api_key: str) -> dict | None:
    """Audite `url` via PageSpeed Insights (stratégie mobile, plus pénalisante).

    Retourne `None` sans jamais lever d'exception si `url`/`api_key` sont
    absents, ou si l'audit échoue pour n'importe quelle raison (timeout, site
    inexistant, quota dépassé, structure de réponse inattendue) — l'audit est
    un enrichissement optionnel, jamais un point de blocage du scraping.
    """
    if not url or not api_key:
        return None

    try:
        resp = httpx.get(
            PAGESPEED_URL,
            params={
                "url": url,
                "key": api_key,
                "strategy": "mobile",
                "category": ["PERFORMANCE", "SEO", "ACCESSIBILITY"],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

        categories = data["lighthouseResult"]["categories"]
        perf = round(categories["performance"]["score"] * 100)
        seo = round(categories["seo"]["score"] * 100)
        accessibilite = round(categories["accessibility"]["score"] * 100)

        audits = data["lighthouseResult"]["audits"]
        fcp = audits.get("first-contentful-paint", {}).get("numericValue")
        lcp = audits.get("largest-contentful-paint", {}).get("numericValue")
        fcp_ms = round(fcp) if fcp is not None else None
        lcp_ms = round(lcp) if lcp is not None else None

        score_global = round(perf * 0.5 + seo * 0.3 + accessibilite * 0.2)

        return {
            "perf": perf,
            "seo": seo,
            "accessibilite": accessibilite,
            "fcp_ms": fcp_ms,
            "lcp_ms": lcp_ms,
            "score_global": score_global,
            "verdict": _verdict(score_global),
            "problemes": _problemes(perf, seo, accessibilite, fcp_ms, lcp_ms),
        }
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        # httpx.HTTPError couvre timeout, site down ET code 429 (quota
        # dépassé, levé par .raise_for_status()) ; KeyError/TypeError/
        # ValueError couvrent une structure de réponse JSON inattendue.
        return None
