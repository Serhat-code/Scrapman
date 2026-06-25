"""Worker d'envoi d'emails — SMTP de l'utilisateur uniquement.

Aucune API payante : l'envoi passe exclusivement par smtplib avec les
identifiants SMTP configurés par l'utilisateur (déchiffrés ici depuis
`sender_profiles.smtp_password_enc`). Le frontend ne fait que mettre les
emails en file (`messages.statut = 'en_file'`) ; ce script est seul
responsable de l'envoi réel.

Deux files sont traitées à chaque exécution :
1. Les premiers emails (`messages` en_file, échus).
2. Les relances planifiées (`sequences` planifie, échues), qui ne sont
   jamais réinjectées dans `messages` (évite les doublons) et sont
   envoyées directement.

Protections anti-spam (non contournables) :
- Quota journalier réel, basé sur `send_logs` (jamais > 200/jour).
- Fenêtre d'envoi (jours + heures) par campagne, défaut lun-ven 08:30-18:30.
- Délai humain aléatoire entre deux envois (défaut 30-60s, jamais < 30s).

Usage :
    python send_worker.py --dry-run --limit 5
    python send_worker.py --limit 20
    python send_worker.py --user-id <uuid> --limit 20
"""

from __future__ import annotations

import smtplib
import ssl
import time
from datetime import datetime, time as dtime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import make_msgid
from typing import Any
from zoneinfo import ZoneInfo

import click
from rich.console import Console

from config import DAILY_EMAIL_CAP
from crypto.smtp import SmtpDecryptionError, decrypt_smtp_password
from db.supabase_client import get_supabase_client
from models.relance import generer_relance
from utils.delay import delai_anti_spam_secondes, verifier_quota_journalier

console = Console()

PARIS_TZ = ZoneInfo("Europe/Paris")

MAX_ATTEMPTS = 3

DEFAULT_SEND_WINDOW_START = dtime(8, 30)
DEFAULT_SEND_WINDOW_END = dtime(18, 30)
DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5]
DEFAULT_MIN_DELAY = 30
DEFAULT_MAX_DELAY = 60

_CHAMPS_SMTP_REQUIS = ("email_from", "smtp_host", "smtp_port", "smtp_user")


# --------------------------------------------------------------------------
# Logique pure (testable sans I/O)
# --------------------------------------------------------------------------
def _parse_heure(valeur: str | None) -> dtime | None:
    if not valeur:
        return None
    parties = valeur.split(":")
    return dtime(int(parties[0]), int(parties[1]))


def dans_fenetre_envoi(settings: dict[str, Any] | None, maintenant: datetime | None = None) -> bool:
    """Vérifie que `maintenant` (Europe/Paris) tombe dans la fenêtre d'envoi autorisée."""
    maintenant = maintenant or datetime.now(PARIS_TZ)
    if maintenant.tzinfo is None:
        maintenant = maintenant.replace(tzinfo=PARIS_TZ)

    settings = settings or {}
    weekdays = settings.get("weekdays") or DEFAULT_WEEKDAYS
    debut = _parse_heure(settings.get("send_window_start")) or DEFAULT_SEND_WINDOW_START
    fin = _parse_heure(settings.get("send_window_end")) or DEFAULT_SEND_WINDOW_END

    if maintenant.isoweekday() not in weekdays:
        return False
    return debut <= maintenant.timetz().replace(tzinfo=None) <= fin


def smtp_pret(profile: dict[str, Any] | None) -> bool:
    """Vérifie que le profil expéditeur a tous les champs SMTP requis."""
    if not profile:
        return False
    if not profile.get("smtp_password_enc"):
        return False
    return all(profile.get(champ) for champ in _CHAMPS_SMTP_REQUIS)


def calculer_plafond_quotidien(
    profile: dict[str, Any] | None, campaign_settings: dict[str, Any] | None
) -> int:
    """Plafond effectif = le plus bas entre cap global, profil et campagne."""
    plafonds = [DAILY_EMAIL_CAP]
    if profile and profile.get("daily_limit"):
        plafonds.append(int(profile["daily_limit"]))
    if campaign_settings and campaign_settings.get("daily_limit"):
        plafonds.append(int(campaign_settings["daily_limit"]))
    return min(plafonds)


def doit_ignorer_relance(prospect: dict[str, Any] | None, message_original: dict[str, Any] | None) -> bool:
    """Détermine si une relance planifiée doit être annulée (pas renvoyée).

    Vrai si le prospect a déjà répondu/qualifié/refusé, ou si le message
    d'origine a été marqué répondu / a une réponse détectée.
    """
    if prospect and prospect.get("statut") in ("refuse", "qualifie"):
        return True
    if message_original:
        if message_original.get("statut") == "repondu":
            return True
        if message_original.get("reply_detected_at"):
            return True
    return False


# --------------------------------------------------------------------------
# Accès Supabase
# --------------------------------------------------------------------------
def _recuperer_sender_profile(client: Any, user_id: str) -> dict[str, Any] | None:
    resp = client.table("sender_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
    return resp.data if resp else None


def _recuperer_campaign_settings(client: Any, campaign_id: str) -> dict[str, Any] | None:
    resp = (
        client.table("campaign_settings")
        .select("*")
        .eq("campaign_id", campaign_id)
        .maybe_single()
        .execute()
    )
    return resp.data if resp else None


def _recuperer_messages_a_traiter(client: Any, limit: int, user_id: str | None) -> list[dict[str, Any]]:
    maintenant_iso = datetime.now(PARIS_TZ).isoformat()
    query = (
        client.table("messages")
        .select("*, campaign:campaigns(id,statut), prospect:prospects(id,email,denomination,dirigeant,statut,user_id)")
        .eq("statut", "en_file")
        .eq("canal", "email")
        .or_(f"scheduled_at.is.null,scheduled_at.lte.{maintenant_iso}")
        .order("created_at", desc=False)
        .limit(limit)
    )
    if user_id:
        query = query.eq("user_id", user_id)
    resp = query.execute()
    return resp.data or []


def _recuperer_relances_a_traiter(client: Any, limit: int, user_id: str | None) -> list[dict[str, Any]]:
    maintenant_iso = datetime.now(PARIS_TZ).isoformat()
    query = (
        client.table("sequences")
        .select(
            "*, campaign:campaigns(id,statut),"
            " prospect:prospects(id,email,denomination,dirigeant,statut,user_id),"
            " message_original:messages!sequences_original_message_id_fkey(id,statut,reply_detected_at)"
        )
        .eq("statut", "planifie")
        .lte("scheduled_at", maintenant_iso)
        .order("scheduled_at", desc=False)
        .limit(limit)
    )
    if user_id:
        query = query.eq("user_id", user_id)
    resp = query.execute()
    return resp.data or []


# --------------------------------------------------------------------------
# Envoi SMTP
# --------------------------------------------------------------------------
def envoyer_smtp(profile: dict[str, Any], password: str, destinataire: str, objet: str, corps: str) -> str:
    """Envoie un email via le SMTP de l'utilisateur. Retourne le Message-Id généré."""
    message_id = make_msgid()

    msg = MIMEMultipart()
    msg["From"] = f'{profile.get("smtp_from_name") or profile.get("prenom") or ""} <{profile["email_from"]}>'
    msg["To"] = destinataire
    msg["Subject"] = objet
    msg["Message-Id"] = message_id
    msg.attach(MIMEText(corps, "plain", "utf-8"))

    host = profile["smtp_host"]
    port = int(profile["smtp_port"])
    secure = profile.get("smtp_secure", True)

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context()) as server:
            server.login(profile["smtp_user"], password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as server:
            if secure:
                server.starttls(context=ssl.create_default_context())
            server.login(profile["smtp_user"], password)
            server.send_message(msg)

    return message_id


# --------------------------------------------------------------------------
# Traitement des premiers emails
# --------------------------------------------------------------------------
def traiter_messages(
    client: Any,
    *,
    limit: int,
    user_id: str | None,
    dry_run: bool,
    profils_cache: dict[str, dict[str, Any] | None],
    mots_de_passe_cache: dict[str, str],
) -> int:
    messages = _recuperer_messages_a_traiter(client, limit, user_id)
    nb_traites = 0

    for message in messages:
        if nb_traites >= limit:
            break

        campagne = message.get("campaign")
        prospect = message.get("prospect")
        cible_user_id = message.get("user_id")

        # Un message peut ne pas être lié à une campagne (ex: `generate-scripts
        # --bucket` en CLI) : dans ce cas il n'y a pas de garde-fou "campagne
        # active" à appliquer. Mais s'il référence une campagne, elle doit
        # être active.
        if message.get("campaign_id") and (not campagne or campagne.get("statut") != "actif"):
            console.print(f"[dim]Message {message['id']} ignoré : campagne non active.[/dim]")
            continue

        if not prospect or not prospect.get("email"):
            console.print(f"[yellow]Message {message['id']} ignoré : prospect sans email.[/yellow]")
            continue

        if cible_user_id not in profils_cache:
            profils_cache[cible_user_id] = _recuperer_sender_profile(client, cible_user_id)
        profile = profils_cache[cible_user_id]

        if not smtp_pret(profile):
            console.print(f"[yellow]Utilisateur {cible_user_id} : configuration SMTP incomplète, envoi suspendu.[/yellow]")
            continue

        campaign_settings = _recuperer_campaign_settings(client, campagne["id"]) if campagne else None

        if not dans_fenetre_envoi(campaign_settings):
            console.print(f"[dim]Message {message['id']} ignoré : hors fenêtre d'envoi.[/dim]")
            continue

        plafond = calculer_plafond_quotidien(profile, campaign_settings)
        peut_envoyer, nb_envoyes = verifier_quota_journalier(cible_user_id, client, cap=plafond)
        if not peut_envoyer:
            console.print(f"[yellow]Utilisateur {cible_user_id} : quota journalier atteint ({nb_envoyes}/{plafond}).[/yellow]")
            continue

        if dry_run:
            console.print(
                f"[cyan][DRY-RUN] Enverrait à {prospect['email']} — \"{message.get('objet')}\"[/cyan]"
            )
            nb_traites += 1
            continue

        if cible_user_id not in mots_de_passe_cache:
            try:
                mots_de_passe_cache[cible_user_id] = decrypt_smtp_password(profile.get("smtp_password_enc"))
            except SmtpDecryptionError as exc:
                console.print(f"[red]Utilisateur {cible_user_id} : {exc}[/red]")
                continue
        password = mots_de_passe_cache[cible_user_id]

        _envoyer_et_mettre_a_jour_message(client, message, prospect, campagne, campaign_settings, profile, password)
        nb_traites += 1

        if nb_traites < limit:
            time.sleep(
                delai_anti_spam_secondes(
                    (campaign_settings or {}).get("min_delay_seconds", DEFAULT_MIN_DELAY),
                    (campaign_settings or {}).get("max_delay_seconds", DEFAULT_MAX_DELAY),
                )
            )

    return nb_traites


def _envoyer_et_mettre_a_jour_message(
    client: Any,
    message: dict[str, Any],
    prospect: dict[str, Any],
    campagne: dict[str, Any],
    campaign_settings: dict[str, Any] | None,
    profile: dict[str, Any],
    password: str,
) -> None:
    user_id = message["user_id"]
    attempt_count = (message.get("attempt_count") or 0) + 1

    try:
        provider_message_id = envoyer_smtp(profile, password, prospect["email"], message.get("objet") or "", message.get("corps") or "")
    except Exception as exc:  # noqa: BLE001 - on isole l'erreur par message
        statut = "erreur" if attempt_count >= MAX_ATTEMPTS else "en_file"
        client.table("messages").update(
            {"attempt_count": attempt_count, "last_error": str(exc), "statut": statut}
        ).eq("id", message["id"]).execute()
        console.print(f"[red]Échec envoi message {message['id']} (tentative {attempt_count}) : {exc}[/red]")
        return

    maintenant = datetime.now(PARIS_TZ)
    updates: dict[str, Any] = {
        "statut": "envoye",
        "sent_at": maintenant.isoformat(),
        "attempt_count": attempt_count,
        "last_error": None,
        "provider_message_id": provider_message_id,
    }

    followup_enabled = bool(campaign_settings and campaign_settings.get("followup_enabled"))
    max_followups = int((campaign_settings or {}).get("max_followups") or 0)
    if followup_enabled and max_followups > 0 and not doit_ignorer_relance(prospect, None):
        delay_days = int((campaign_settings or {}).get("followup_delay_days") or 4)
        prochaine = maintenant + timedelta(days=delay_days)
        updates["next_followup_at"] = prochaine.isoformat()

        relance = generer_relance(prospect, 1, max_followups, sender=profile)
        client.table("sequences").insert(
            {
                "user_id": user_id,
                "prospect_id": prospect["id"],
                "campaign_id": campagne["id"],
                "original_message_id": message["id"],
                "etape": 1,
                "date_prevue": prochaine.date().isoformat(),
                "scheduled_at": prochaine.isoformat(),
                "statut": "planifie",
                "objet": relance["objet"],
                "corps": relance["corps"],
            }
        ).execute()

    client.table("messages").update(updates).eq("id", message["id"]).execute()
    client.table("send_logs").insert(
        {"user_id": user_id, "message_id": message["id"], "prospect_id": prospect["id"]}
    ).execute()
    console.print(f"[green]Email envoyé à {prospect['email']} ({message['id']}).[/green]")


# --------------------------------------------------------------------------
# Traitement des relances
# --------------------------------------------------------------------------
def traiter_relances(
    client: Any,
    *,
    limit: int,
    user_id: str | None,
    dry_run: bool,
    profils_cache: dict[str, dict[str, Any] | None],
    mots_de_passe_cache: dict[str, str],
) -> int:
    relances = _recuperer_relances_a_traiter(client, limit, user_id)
    nb_traites = 0

    for relance in relances:
        if nb_traites >= limit:
            break

        campagne = relance.get("campaign")
        prospect = relance.get("prospect")
        message_original = relance.get("message_original")
        cible_user_id = relance.get("user_id")

        if not campagne or campagne.get("statut") != "actif":
            console.print(f"[dim]Relance {relance['id']} ignorée : campagne non active.[/dim]")
            continue

        if doit_ignorer_relance(prospect, message_original):
            if not dry_run:
                client.table("sequences").update({"statut": "ignore"}).eq("id", relance["id"]).execute()
            console.print(f"[dim]Relance {relance['id']} annulée : prospect déjà répondu/qualifié/refusé.[/dim]")
            continue

        if not prospect or not prospect.get("email"):
            if not dry_run:
                client.table("sequences").update(
                    {"statut": "echoue", "last_error": "Prospect sans email"}
                ).eq("id", relance["id"]).execute()
            continue

        if cible_user_id not in profils_cache:
            profils_cache[cible_user_id] = _recuperer_sender_profile(client, cible_user_id)
        profile = profils_cache[cible_user_id]

        if not smtp_pret(profile):
            console.print(f"[yellow]Utilisateur {cible_user_id} : configuration SMTP incomplète, relance suspendue.[/yellow]")
            continue

        campaign_settings = _recuperer_campaign_settings(client, campagne["id"])

        if not campaign_settings or not campaign_settings.get("followup_enabled"):
            console.print(f"[dim]Relance {relance['id']} ignorée : relances désactivées pour cette campagne.[/dim]")
            continue

        if not dans_fenetre_envoi(campaign_settings):
            console.print(f"[dim]Relance {relance['id']} ignorée : hors fenêtre d'envoi.[/dim]")
            continue

        plafond = calculer_plafond_quotidien(profile, campaign_settings)
        peut_envoyer, nb_envoyes = verifier_quota_journalier(cible_user_id, client, cap=plafond)
        if not peut_envoyer:
            console.print(f"[yellow]Utilisateur {cible_user_id} : quota journalier atteint ({nb_envoyes}/{plafond}).[/yellow]")
            continue

        if dry_run:
            console.print(
                f"[cyan][DRY-RUN] Relancerait {prospect['email']} (étape {relance['etape']}) — \"{relance.get('objet')}\"[/cyan]"
            )
            nb_traites += 1
            continue

        if cible_user_id not in mots_de_passe_cache:
            try:
                mots_de_passe_cache[cible_user_id] = decrypt_smtp_password(profile.get("smtp_password_enc"))
            except SmtpDecryptionError as exc:
                console.print(f"[red]Utilisateur {cible_user_id} : {exc}[/red]")
                continue
        password = mots_de_passe_cache[cible_user_id]

        _envoyer_et_mettre_a_jour_relance(client, relance, prospect, campagne, campaign_settings, profile, password)
        nb_traites += 1

        if nb_traites < limit:
            time.sleep(
                delai_anti_spam_secondes(
                    campaign_settings.get("min_delay_seconds", DEFAULT_MIN_DELAY),
                    campaign_settings.get("max_delay_seconds", DEFAULT_MAX_DELAY),
                )
            )

    return nb_traites


def _envoyer_et_mettre_a_jour_relance(
    client: Any,
    relance: dict[str, Any],
    prospect: dict[str, Any],
    campagne: dict[str, Any],
    campaign_settings: dict[str, Any],
    profile: dict[str, Any],
    password: str,
) -> None:
    user_id = relance["user_id"]

    try:
        envoyer_smtp(profile, password, prospect["email"], relance.get("objet") or "", relance.get("corps") or "")
    except Exception as exc:  # noqa: BLE001 - on isole l'erreur par relance
        client.table("sequences").update({"statut": "echoue", "last_error": str(exc)}).eq("id", relance["id"]).execute()
        console.print(f"[red]Échec relance {relance['id']} : {exc}[/red]")
        return

    maintenant = datetime.now(PARIS_TZ)
    client.table("sequences").update(
        {"statut": "envoye", "sent_at": maintenant.isoformat(), "last_error": None}
    ).eq("id", relance["id"]).execute()
    client.table("send_logs").insert(
        {"user_id": user_id, "message_id": relance.get("original_message_id"), "prospect_id": prospect["id"]}
    ).execute()
    console.print(f"[green]Relance envoyée à {prospect['email']} ({relance['id']}).[/green]")

    etape_suivante = relance["etape"] + 1
    max_followups = int(campaign_settings.get("max_followups") or 0)
    if etape_suivante <= max_followups:
        delay_days = int(campaign_settings.get("followup_delay_days") or 4)
        prochaine = maintenant + timedelta(days=delay_days)
        relance_suivante = generer_relance(prospect, etape_suivante, max_followups, sender=profile)
        client.table("sequences").insert(
            {
                "user_id": user_id,
                "prospect_id": prospect["id"],
                "campaign_id": campagne["id"],
                "original_message_id": relance.get("original_message_id"),
                "etape": etape_suivante,
                "date_prevue": prochaine.date().isoformat(),
                "scheduled_at": prochaine.isoformat(),
                "statut": "planifie",
                "objet": relance_suivante["objet"],
                "corps": relance_suivante["corps"],
            }
        ).execute()


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
@click.command()
@click.option("--dry-run", is_flag=True, default=False, help="Simule sans envoyer ni écrire en base.")
@click.option("--limit", default=20, type=int, help="Nombre maximum d'envois (emails + relances confondus) par exécution.")
@click.option("--user-id", default=None, help="Limite le traitement à un utilisateur (sinon tous les utilisateurs en file).")
def main(dry_run: bool, limit: int, user_id: str | None) -> None:
    """Traite la file d'envoi (premiers emails puis relances), avec quota et anti-spam."""
    mode = "[bold cyan]DRY-RUN[/bold cyan]" if dry_run else "[bold green]ENVOI RÉEL[/bold green]"
    console.print(f"{mode} — limite {limit} envoi(s)")

    client = get_supabase_client()
    profils_cache: dict[str, dict[str, Any] | None] = {}
    mots_de_passe_cache: dict[str, str] = {}

    nb_messages = traiter_messages(
        client,
        limit=limit,
        user_id=user_id,
        dry_run=dry_run,
        profils_cache=profils_cache,
        mots_de_passe_cache=mots_de_passe_cache,
    )

    limite_restante = max(limit - nb_messages, 0)
    nb_relances = 0
    if limite_restante > 0:
        nb_relances = traiter_relances(
            client,
            limit=limite_restante,
            user_id=user_id,
            dry_run=dry_run,
            profils_cache=profils_cache,
            mots_de_passe_cache=mots_de_passe_cache,
        )

    console.print(f"[bold]{nb_messages} email(s) initial(aux) et {nb_relances} relance(s) traité(s).[/bold]")


if __name__ == "__main__":
    main()
