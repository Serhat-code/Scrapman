"""Configuration centrale du bot Scrapman.

Charge les variables d'environnement depuis `.env` et expose les
constantes utilisées par le reste de l'application (URLs d'API,
quotas, délais anti-spam, libellés NAF, etc.).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Charge le fichier .env situé à la racine du dossier scraper/
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------
SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")


# --------------------------------------------------------------------------
# Chiffrement SMTP (doit être identique à SMTP_ENCRYPTION_KEY du frontend)
# --------------------------------------------------------------------------
SMTP_ENCRYPTION_KEY: str = os.getenv("SMTP_ENCRYPTION_KEY", "")


# --------------------------------------------------------------------------
# INSEE SIRENE (optionnel)
# --------------------------------------------------------------------------
INSEE_API_KEY: str = os.getenv("INSEE_API_KEY", "")
SIRENE_ENABLED: bool = bool(INSEE_API_KEY)


# --------------------------------------------------------------------------
# Config générale
# --------------------------------------------------------------------------
SCRAPMAN_DEFAULT_USER_ID: str = os.getenv("SCRAPMAN_DEFAULT_USER_ID", "")
VILLE_PROSPECTEUR: str = os.getenv("VILLE_PROSPECTEUR", "Saint-Étienne")
CALENDLY_URL: str = os.getenv("CALENDLY_URL", "calendly.com/atlamazstudio/30min")


# --------------------------------------------------------------------------
# APIs publiques
# --------------------------------------------------------------------------
RECHERCHE_ENTREPRISES_URL = "https://recherche-entreprises.api.gouv.fr/search"
SIRENE_API_URL = "https://api.insee.fr/api-sirene/3.11"
GEO_API_URL = "https://geo.api.gouv.fr/communes"
ANNUAIRE_ENTREPRISES_URL = "https://annuaire-entreprises.data.gouv.fr/api"

RECHERCHE_ENTREPRISES_PER_PAGE = 25


# --------------------------------------------------------------------------
# Quotas & anti-spam
# --------------------------------------------------------------------------
DAILY_EMAIL_CAP = 200
DELAY_MIN_SECONDS = 30
DELAY_MAX_SECONDS = 60

MAX_VILLES = 30
MAX_SCRAPE_LIMIT = 500


# --------------------------------------------------------------------------
# Départements France entière (96 métropole + DOM)
# --------------------------------------------------------------------------
def _build_departements() -> list[str]:
    departements: list[str] = []
    for i in range(1, 96):
        if i == 20:
            # Corse : 2A et 2B remplacent le 20
            departements.extend(["2A", "2B"])
            continue
        departements.append(f"{i:02d}")
    # DOM
    departements.extend(["971", "972", "973", "974", "975", "976"])
    return departements


DEPARTEMENTS_FRANCE = _build_departements()


# --------------------------------------------------------------------------
# Communes à arrondissements (Paris, Lyon, Marseille)
# --------------------------------------------------------------------------
# Ces 3 villes n'ont pas d'établissements enregistrés sous leur code INSEE
# "ville entière" (ex. 13055 pour Marseille) — chaque établissement est
# rattaché au code de son arrondissement (13201-13216). Une recherche par
# code_commune=13055 renvoie donc toujours 0 résultat.
COMMUNES_A_ARRONDISSEMENTS: dict[str, list[str]] = {
    "75056": [f"751{i:02d}" for i in range(1, 21)],  # Paris
    "69123": [f"6938{i}" for i in range(1, 10)],  # Lyon
    "13055": [f"132{i:02d}" for i in range(1, 17)],  # Marseille
}


# --------------------------------------------------------------------------
# Libellés NAF utilisés pour les templates (scripts / emails)
# --------------------------------------------------------------------------
NAF_LIBELLES: dict[str, str] = {
    "5610A": "restauration traditionnelle",
    "5610C": "restauration rapide",
    "4722Z": "commerce de détail de viandes et produits à base de viande",
    "4711C": "supérette",
    "4711D": "supermarché",
    "4711F": "commerce d'alimentation générale",
    "9602A": "coiffure",
    "5621Z": "traiteur",
    "4776Z": "commerce de détail de fleurs, plantes",
}


def naf_libelle(code: str | None) -> str:
    """Retourne le libellé lisible d'un code NAF, ou le code brut si inconnu."""
    if not code:
        return "votre activité"
    return NAF_LIBELLES.get(code.upper(), code)


# --------------------------------------------------------------------------
# Tranches d'effectif salarié (codes INSEE)
# --------------------------------------------------------------------------
TRANCHE_EFFECTIF_LABELS: dict[str, str] = {
    "NN": "Non renseigné",
    "00": "0 salarié",
    "01": "1 ou 2",
    "02": "3 à 5",
    "03": "6 à 9",
    "11": "10 à 19",
    "12": "20 à 49",
    "21": "50 à 99",
    "22": "100 à 199",
    "31": "200 à 249",
    "32": "250 à 499",
    "41": "500 à 999",
    "42": "1 000 à 1 999",
    "51": "2 000 à 4 999",
    "52": "5 000 à 9 999",
    "53": "10 000 ou plus",
}

# Codes correspondant à 500 salariés ou plus -> grandes entreprises
TRANCHE_CODES_GRANDES_ENTREPRISES = {"41", "42", "51", "52", "53"}

# Tranches considérées comme TPE idéale pour le scoring
TRANCHES_TPE_IDEALE = {"01", "02", "03", "11"}


def tranche_effectif_label(code: str | None) -> str | None:
    """Convertit un code INSEE de tranche d'effectif en libellé lisible."""
    if not code:
        return None
    return TRANCHE_EFFECTIF_LABELS.get(code, code)
