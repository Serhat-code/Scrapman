"""Analyse du site web d'un prospect (Playwright + audit PageSpeed Insights).

Si `site_url` est inconnu, on tente de deviner le nom de domaine à partir
de la dénomination (`{slug}.fr` / `{slug}.com`, avec ou sans `www.`) et on
vérifie son existence via une simple requête HTTP.

Une fois l'URL connue, Playwright charge la page (en viewport mobile) et
détecte :
- `email` / `email_is_generic` : première adresse trouvée sur la page
  (ou la page de contact)
- `telephone` : premier numéro français détecté
- `reseaux_sociaux` : liens Facebook / Instagram / LinkedIn détectés

`site_lent` et `site_non_mobile` proviennent exclusivement de l'audit
PageSpeed Insights (`audit_site`, voir `audit/pagespeed.py`) — `None` si
`GOOGLE_PAGESPEED_API_KEY` n'est pas configurée ou si l'audit a échoué pour
ce site (l'ancienne heuristique locale, basée sur le temps de chargement
Playwright et la présence d'une balise viewport, a été retirée : trop
approximative comparée aux vrais chiffres Lighthouse).
"""

from __future__ import annotations

import asyncio
import os
import re
import unicodedata
from typing import Any

import httpx
from playwright.async_api import Browser

from audit.pagespeed import SEUIL_MEDIOCRE, auditer_site

# Délai après chaque appel PageSpeed pour rester sous le quota gratuit
# quotidien sur les gros runs (un audit par site, en plus du throttling
# 1/s déjà appliqué par le worker d'enrichissement).
DELAI_APRES_AUDIT_SECONDES = 0.5

# --------------------------------------------------------------------------
# Devinette de nom de domaine
# --------------------------------------------------------------------------

SUFFIXES_JURIDIQUES = {"sarl", "sas", "sasu", "eurl", "sa", "snc", "scop", "ei", "eirl", "sci"}


def _slugifier(denomination: str) -> str:
    """Convertit une dénomination en slug utilisable comme nom de domaine."""
    texte = unicodedata.normalize("NFKD", denomination).encode("ascii", "ignore").decode()
    mots = re.findall(r"[a-zA-Z0-9]+", texte.lower())
    mots = [m for m in mots if m not in SUFFIXES_JURIDIQUES]
    return "".join(mots)


def _construire_candidats(slug: str) -> list[str]:
    return [
        f"https://www.{slug}.fr",
        f"https://{slug}.fr",
        f"https://www.{slug}.com",
        f"https://{slug}.com",
    ]


async def _verifier_url(client: httpx.AsyncClient, url: str) -> bool:
    try:
        resp = await client.get(url, timeout=8.0, follow_redirects=True)
        return resp.status_code < 400
    except httpx.HTTPError:
        return False


async def deviner_site_web(client: httpx.AsyncClient, denomination: str) -> str | None:
    """Tente de deviner et vérifier le site web d'une entreprise à partir de son nom."""
    slug = _slugifier(denomination or "")
    if not slug:
        return None

    for candidat in _construire_candidats(slug):
        if await _verifier_url(client, candidat):
            return candidat

    return None


# --------------------------------------------------------------------------
# Analyse de la page (Playwright)
# --------------------------------------------------------------------------

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
TELEPHONE_REGEX = re.compile(r"(?:\+33[\s.\-]?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}")

PREFIXES_EMAIL_GENERIQUES = (
    "contact", "info", "infos", "hello", "bonjour", "accueil",
    "secretariat", "contactez", "mail", "email",
)

RESEAUX_PATTERNS: dict[str, re.Pattern[str]] = {
    "facebook": re.compile(r"facebook\.com/[a-zA-Z0-9_./\-]+", re.I),
    "instagram": re.compile(r"instagram\.com/[a-zA-Z0-9_./\-]+", re.I),
    "linkedin": re.compile(r"linkedin\.com/[a-zA-Z0-9_./\-]+", re.I),
}


def _email_est_generique(email: str) -> bool:
    local = email.split("@")[0].lower()
    return any(local.startswith(prefixe) for prefixe in PREFIXES_EMAIL_GENERIQUES)


def _formatter_telephone(numero: str) -> str:
    return re.sub(r"\s+", " ", numero).strip()


async def _trouver_lien_contact(page: Any) -> str | None:
    """Cherche un lien dont le texte ou l'URL contient 'contact'."""
    try:
        liens = await page.eval_on_selector_all(
            "a",
            "els => els.map(e => ({href: e.href, texte: e.textContent || ''}))",
        )
    except Exception:
        return None

    for lien in liens:
        href = lien.get("href") or ""
        texte = (lien.get("texte") or "").lower()
        if "contact" in href.lower() or "contact" in texte:
            return href

    return None


def _extraire_donnees(html: str) -> dict[str, Any]:
    donnees: dict[str, Any] = {}

    emails = EMAIL_REGEX.findall(html)
    if emails:
        donnees["email"] = emails[0]
        donnees["email_is_generic"] = _email_est_generique(emails[0])

    telephones = TELEPHONE_REGEX.findall(html)
    if telephones:
        donnees["telephone"] = _formatter_telephone(telephones[0])

    reseaux: dict[str, str] = {}
    for plateforme, pattern in RESEAUX_PATTERNS.items():
        match = pattern.search(html)
        if match:
            reseaux[plateforme] = f"https://{match.group(0)}"
    if reseaux:
        donnees["reseaux_sociaux"] = reseaux

    return donnees


async def analyser_site(browser: Browser, url: str) -> dict[str, Any]:
    """Charge `url` et retourne les champs détectés (contact, réseaux).

    `site_lent`/`site_non_mobile` ne sont plus déduits ici (voir le
    docstring du module) — ils sont ajoutés par `enrichir_site_prospect`
    à partir de l'audit PageSpeed Insights.
    """
    resultat: dict[str, Any] = {
        "email": None,
        "email_is_generic": None,
        "telephone": None,
        "reseaux_sociaux": None,
    }

    page = await browser.new_page(viewport={"width": 390, "height": 844})
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)

        html = await page.content()
        resultat.update(_extraire_donnees(html))

        if not resultat.get("email") or not resultat.get("telephone"):
            lien_contact = await _trouver_lien_contact(page)
            if lien_contact:
                try:
                    await page.goto(lien_contact, wait_until="domcontentloaded", timeout=15000)
                    html_contact = await page.content()
                    donnees_contact = _extraire_donnees(html_contact)
                    for cle in ("email", "email_is_generic", "telephone", "reseaux_sociaux"):
                        if not resultat.get(cle) and donnees_contact.get(cle):
                            resultat[cle] = donnees_contact[cle]
                except Exception:
                    pass
    except Exception:
        # Site inaccessible : on ne bloque pas le pipeline, le prospect garde
        # ses valeurs par défaut (None) et reste éligible au bucket "pas de site".
        pass
    finally:
        await page.close()

    return resultat


async def enrichir_site_prospect(
    prospect: dict[str, Any],
    client: httpx.AsyncClient,
    browser: Browser,
) -> dict[str, Any]:
    """Trouve (si besoin) et analyse le site web d'un prospect.

    Retourne un dict de champs à fusionner dans le prospect (`site_url`,
    `site_non_mobile`, `site_lent`, `email`, `email_is_generic`,
    `telephone`, `reseaux_sociaux`, `audit_site`). `site_lent`/
    `site_non_mobile` valent `None` si l'audit PageSpeed n'a pas pu être
    réalisé (voir le docstring du module).
    """
    site_url = prospect.get("site_url")

    if not site_url:
        site_url = await deviner_site_web(client, prospect.get("denomination") or "")
        if site_url is None:
            return {"site_url": None}

    analyse = await analyser_site(browser, site_url)
    analyse["site_url"] = site_url

    audit = await _auditer_site_pagespeed(site_url)
    analyse["audit_site"] = audit
    analyse["site_lent"] = audit["perf"] < SEUIL_MEDIOCRE if audit else None
    analyse["site_non_mobile"] = audit["accessibilite"] < SEUIL_MEDIOCRE if audit else None

    return analyse


async def _auditer_site_pagespeed(site_url: str) -> dict[str, Any] | None:
    """Lance l'audit PageSpeed (bloquant) dans un thread, sans bloquer la boucle asyncio.

    Sans `GOOGLE_PAGESPEED_API_KEY`, ne fait aucun appel réseau et retourne
    None immédiatement — l'audit reste un enrichissement strictement optionnel.
    """
    api_key = os.getenv("GOOGLE_PAGESPEED_API_KEY", "")
    if not api_key:
        return None

    audit = await asyncio.to_thread(auditer_site, site_url, api_key)
    await asyncio.sleep(DELAI_APRES_AUDIT_SECONDES)
    return audit
