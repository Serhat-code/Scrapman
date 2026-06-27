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

Concurrence : en mode réel (pas dry-run), chaque ligne est verrouillée
atomiquement via `claim_messages`/`claim_followups` (FOR UPDATE SKIP LOCKED
côté Postgres) avant traitement — plusieurs instances de ce script peuvent
tourner en parallèle sans jamais envoyer le même email deux fois.

Usage :
    python send_worker.py --dry-run --limit 5
    python send_worker.py --limit 20
    python send_worker.py --user-id <uuid> --limit 20
"""

from __future__ import annotations

import os
import smtplib
import socket
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
from db.plans import recuperer_limite_emails_plan
from db.supabase_client import get_supabase_client
from db.team import resoudre_team_id
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
    profile: dict[str, Any] | None,
    campaign_settings: dict[str, Any] | None,
    limite_plan: int | None = None,
) -> int:
    """Plafond effectif = le plus bas entre plafond du plan payant (ou cap
    global par défaut si l'équipe n'a pas d'abonnement actif), profil et
    campagne."""
    plafonds = [limite_plan if limite_plan is not None else DAILY_EMAIL_CAP]
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
def _recuperer_sender_profile(client: Any, team_id: str) -> dict[str, Any] | None:
    """sender_profiles est scopé par équipe : partagé par tous ses membres."""
    resp = client.table("sender_profiles").select("*").eq("team_id", team_id).maybe_single().execute()
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


def _recuperer_messages_a_traiter(client: Any, limit: int, team_id: str | None) -> list[dict[str, Any]]:
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
    if team_id:
        query = query.eq("team_id", team_id)
    resp = query.execute()
    return resp.data or []


def _recuperer_relances_a_traiter(client: Any, limit: int, team_id: str | None) -> list[dict[str, Any]]:
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
    if team_id:
        query = query.eq("team_id", team_id)
    resp = query.execute()
    return resp.data or []


def _claim_et_recuperer_messages(
    client: Any, limit: int, team_id: str | None, worker_id: str
) -> list[dict[str, Any]]:
    """Verrouille atomiquement jusqu'à `limit` messages (claim_messages, cf.
    schema.sql) puis récupère leurs données jointes. Seul ce worker peut les
    traiter tant que le verrou n'a pas expiré (5 min) ou n'a pas été libéré."""
    claimed = client.rpc(
        "claim_messages", {"p_worker_id": worker_id, "p_limit": limit, "p_team_id": team_id}
    ).execute()
    ids = claimed.data or []
    if not ids:
        return []
    resp = (
        client.table("messages")
        .select("*, campaign:campaigns(id,statut), prospect:prospects(id,email,denomination,dirigeant,statut,user_id)")
        .in_("id", ids)
        .order("created_at", desc=False)
        .execute()
    )
    return resp.data or []


def _claim_et_recuperer_relances(
    client: Any, limit: int, team_id: str | None, worker_id: str
) -> list[dict[str, Any]]:
    """Équivalent de `_claim_et_recuperer_messages` pour les relances planifiées."""
    claimed = client.rpc(
        "claim_followups", {"p_worker_id": worker_id, "p_limit": limit, "p_team_id": team_id}
    ).execute()
    ids = claimed.data or []
    if not ids:
        return []
    resp = (
        client.table("sequences")
        .select(
            "*, campaign:campaigns(id,statut),"
            " prospect:prospects(id,email,denomination,dirigeant,statut,user_id),"
            " message_original:messages!sequences_original_message_id_fkey(id,statut,reply_detected_at)"
        )
        .in_("id", ids)
        .order("scheduled_at", desc=False)
        .execute()
    )
    return resp.data or []


def _liberer_verrou(client: Any, table: str, id_: str, worker_id: str) -> None:
    """Libère le verrou posé par `claim_messages`/`claim_followups` pour
    cette ligne — appelé en `finally` à chaque itération en mode réel pour
    qu'une ligne non envoyée (campagne en pause, quota atteint, etc.) soit
    immédiatement réclamable au prochain passage plutôt que d'attendre
    l'expiration de 5 minutes."""
    client.table(table).update({"locked_at": None, "locked_by": None}).eq("id", id_).eq(
        "locked_by", worker_id
    ).execute()


def _journaliser_systeme(
    client: Any, level: str, source: str, message: str, metadata: dict[str, Any] | None = None
) -> None:
    """Insertion best-effort dans system_logs (visible sur /admin/logs) — la
    journalisation ne doit jamais faire échouer le run en cas de problème."""
    try:
        client.table("system_logs").insert(
            {"level": level, "source": source, "message": message, "metadata": metadata}
        ).execute()
    except Exception:  # noqa: BLE001 - best-effort, ne doit jamais remonter
        pass


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
    team_id: str | None,
    dry_run: bool,
    profils_cache: dict[str, dict[str, Any] | None],
    mots_de_passe_cache: dict[str, str],
    limites_plan_cache: dict[str, int | None] | None = None,
    worker_id: str = "manual",
) -> int:
    if limites_plan_cache is None:
        limites_plan_cache = {}
    # En dry-run, on ne pose aucun verrou (aucune écriture) : simple lecture.
    # En mode réel, on claim atomiquement (FOR UPDATE SKIP LOCKED) pour que
    # deux workers concurrents ne puissent jamais traiter le même message.
    messages = (
        _recuperer_messages_a_traiter(client, limit, team_id)
        if dry_run
        else _claim_et_recuperer_messages(client, limit, team_id, worker_id)
    )
    nb_traites = 0

    for message in messages:
        if nb_traites >= limit:
            if not dry_run:
                _liberer_verrou(client, "messages", message["id"], worker_id)
            break

        try:
            campagne = message.get("campaign")
            prospect = message.get("prospect")
            cible_team_id = message.get("team_id")

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

            if cible_team_id not in profils_cache:
                profils_cache[cible_team_id] = _recuperer_sender_profile(client, cible_team_id)
            profile = profils_cache[cible_team_id]

            if not smtp_pret(profile):
                console.print(f"[yellow]Équipe {cible_team_id} : configuration SMTP incomplète, envoi suspendu.[/yellow]")
                continue

            campaign_settings = _recuperer_campaign_settings(client, campagne["id"]) if campagne else None

            if not dans_fenetre_envoi(campaign_settings):
                console.print(f"[dim]Message {message['id']} ignoré : hors fenêtre d'envoi.[/dim]")
                continue

            if cible_team_id not in limites_plan_cache:
                limites_plan_cache[cible_team_id] = recuperer_limite_emails_plan(client, cible_team_id)
            limite_plan = limites_plan_cache[cible_team_id]

            plafond = calculer_plafond_quotidien(profile, campaign_settings, limite_plan)
            peut_envoyer, nb_envoyes = verifier_quota_journalier(cible_team_id, client, cap=plafond)
            if not peut_envoyer:
                console.print(f"[yellow]Équipe {cible_team_id} : quota journalier atteint ({nb_envoyes}/{plafond}).[/yellow]")
                continue

            if dry_run:
                console.print(
                    f"[cyan][DRY-RUN] Enverrait à {prospect['email']} — \"{message.get('objet')}\"[/cyan]"
                )
                nb_traites += 1
                continue

            if cible_team_id not in mots_de_passe_cache:
                try:
                    mots_de_passe_cache[cible_team_id] = decrypt_smtp_password(profile.get("smtp_password_enc"))
                except SmtpDecryptionError as exc:
                    console.print(f"[red]Équipe {cible_team_id} : {exc}[/red]")
                    continue
            password = mots_de_passe_cache[cible_team_id]

            _envoyer_et_mettre_a_jour_message(client, message, prospect, campagne, campaign_settings, profile, password)
            nb_traites += 1
        finally:
            if not dry_run:
                _liberer_verrou(client, "messages", message["id"], worker_id)

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
    team_id = message["team_id"]
    attempt_count = (message.get("attempt_count") or 0) + 1

    try:
        provider_message_id = envoyer_smtp(profile, password, prospect["email"], message.get("objet") or "", message.get("corps") or "")
    except Exception as exc:  # noqa: BLE001 - on isole l'erreur par message
        statut = "erreur" if attempt_count >= MAX_ATTEMPTS else "en_file"
        client.table("messages").update(
            {"attempt_count": attempt_count, "last_error": str(exc), "statut": statut}
        ).eq("id", message["id"]).execute()
        console.print(f"[red]Échec envoi message {message['id']} (tentative {attempt_count}) : {exc}[/red]")
        _journaliser_systeme(
            client,
            "error",
            "worker",
            f"Échec envoi message {message['id']} (tentative {attempt_count}) : {exc}",
            {"message_id": message["id"], "team_id": team_id},
        )
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
                "team_id": team_id,
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
        {"user_id": user_id, "team_id": team_id, "message_id": message["id"], "prospect_id": prospect["id"]}
    ).execute()
    console.print(f"[green]Email envoyé à {prospect['email']} ({message['id']}).[/green]")


# --------------------------------------------------------------------------
# Traitement des relances
# --------------------------------------------------------------------------
def traiter_relances(
    client: Any,
    *,
    limit: int,
    team_id: str | None,
    dry_run: bool,
    profils_cache: dict[str, dict[str, Any] | None],
    mots_de_passe_cache: dict[str, str],
    limites_plan_cache: dict[str, int | None] | None = None,
    worker_id: str = "manual",
) -> int:
    if limites_plan_cache is None:
        limites_plan_cache = {}
    relances = (
        _recuperer_relances_a_traiter(client, limit, team_id)
        if dry_run
        else _claim_et_recuperer_relances(client, limit, team_id, worker_id)
    )
    nb_traites = 0

    for relance in relances:
        if nb_traites >= limit:
            if not dry_run:
                _liberer_verrou(client, "sequences", relance["id"], worker_id)
            break

        try:
            campagne = relance.get("campaign")
            prospect = relance.get("prospect")
            message_original = relance.get("message_original")
            cible_team_id = relance.get("team_id")

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

            if cible_team_id not in profils_cache:
                profils_cache[cible_team_id] = _recuperer_sender_profile(client, cible_team_id)
            profile = profils_cache[cible_team_id]

            if not smtp_pret(profile):
                console.print(f"[yellow]Équipe {cible_team_id} : configuration SMTP incomplète, relance suspendue.[/yellow]")
                continue

            campaign_settings = _recuperer_campaign_settings(client, campagne["id"])

            if not campaign_settings or not campaign_settings.get("followup_enabled"):
                console.print(f"[dim]Relance {relance['id']} ignorée : relances désactivées pour cette campagne.[/dim]")
                continue

            if not dans_fenetre_envoi(campaign_settings):
                console.print(f"[dim]Relance {relance['id']} ignorée : hors fenêtre d'envoi.[/dim]")
                continue

            if cible_team_id not in limites_plan_cache:
                limites_plan_cache[cible_team_id] = recuperer_limite_emails_plan(client, cible_team_id)
            limite_plan = limites_plan_cache[cible_team_id]

            plafond = calculer_plafond_quotidien(profile, campaign_settings, limite_plan)
            peut_envoyer, nb_envoyes = verifier_quota_journalier(cible_team_id, client, cap=plafond)
            if not peut_envoyer:
                console.print(f"[yellow]Équipe {cible_team_id} : quota journalier atteint ({nb_envoyes}/{plafond}).[/yellow]")
                continue

            if dry_run:
                console.print(
                    f"[cyan][DRY-RUN] Relancerait {prospect['email']} (étape {relance['etape']}) — \"{relance.get('objet')}\"[/cyan]"
                )
                nb_traites += 1
                continue

            if cible_team_id not in mots_de_passe_cache:
                try:
                    mots_de_passe_cache[cible_team_id] = decrypt_smtp_password(profile.get("smtp_password_enc"))
                except SmtpDecryptionError as exc:
                    console.print(f"[red]Équipe {cible_team_id} : {exc}[/red]")
                    continue
            password = mots_de_passe_cache[cible_team_id]

            _envoyer_et_mettre_a_jour_relance(client, relance, prospect, campagne, campaign_settings, profile, password)
            nb_traites += 1
        finally:
            if not dry_run:
                _liberer_verrou(client, "sequences", relance["id"], worker_id)

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
    team_id = relance["team_id"]

    try:
        envoyer_smtp(profile, password, prospect["email"], relance.get("objet") or "", relance.get("corps") or "")
    except Exception as exc:  # noqa: BLE001 - on isole l'erreur par relance
        client.table("sequences").update({"statut": "echoue", "last_error": str(exc)}).eq("id", relance["id"]).execute()
        console.print(f"[red]Échec relance {relance['id']} : {exc}[/red]")
        _journaliser_systeme(
            client,
            "error",
            "worker",
            f"Échec relance {relance['id']} : {exc}",
            {"sequence_id": relance["id"], "team_id": team_id},
        )
        return

    maintenant = datetime.now(PARIS_TZ)
    client.table("sequences").update(
        {"statut": "envoye", "sent_at": maintenant.isoformat(), "last_error": None}
    ).eq("id", relance["id"]).execute()
    client.table("send_logs").insert(
        {
            "user_id": user_id,
            "team_id": team_id,
            "message_id": relance.get("original_message_id"),
            "prospect_id": prospect["id"],
        }
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
                "team_id": team_id,
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
@click.option(
    "--user-id",
    default=None,
    help="Limite le traitement à l'équipe de cet utilisateur (sinon toutes les équipes en file).",
)
def main(dry_run: bool, limit: int, user_id: str | None) -> None:
    """Traite la file d'envoi (premiers emails puis relances), avec quota et anti-spam."""
    mode = "[bold cyan]DRY-RUN[/bold cyan]" if dry_run else "[bold green]ENVOI RÉEL[/bold green]"
    # Identifiant unique de ce processus — utilisé par claim_messages/
    # claim_followups pour garantir qu'aucune ligne n'est traitée par deux
    # workers en même temps, même si plusieurs instances tournent en
    # parallèle (cron + déclenchement manuel, plusieurs machines, etc.).
    worker_id = f"{socket.gethostname()}-{os.getpid()}"
    console.print(f"{mode} — limite {limit} envoi(s) — worker {worker_id}")

    client = get_supabase_client()
    profils_cache: dict[str, dict[str, Any] | None] = {}
    mots_de_passe_cache: dict[str, str] = {}
    limites_plan_cache: dict[str, int | None] = {}

    team_id: str | None = None
    if user_id:
        team_id = resoudre_team_id(client, user_id)
        if not team_id:
            console.print(f"[red]Aucune équipe trouvée pour l'utilisateur {user_id}.[/red]")
            return

    nb_messages = traiter_messages(
        client,
        limit=limit,
        team_id=team_id,
        dry_run=dry_run,
        profils_cache=profils_cache,
        mots_de_passe_cache=mots_de_passe_cache,
        limites_plan_cache=limites_plan_cache,
        worker_id=worker_id,
    )

    limite_restante = max(limit - nb_messages, 0)
    nb_relances = 0
    if limite_restante > 0:
        nb_relances = traiter_relances(
            client,
            limit=limite_restante,
            team_id=team_id,
            dry_run=dry_run,
            profils_cache=profils_cache,
            mots_de_passe_cache=mots_de_passe_cache,
            limites_plan_cache=limites_plan_cache,
            worker_id=worker_id,
        )

    console.print(f"[bold]{nb_messages} email(s) initial(aux) et {nb_relances} relance(s) traité(s).[/bold]")

    if not dry_run:
        _journaliser_systeme(
            client,
            "info",
            "worker",
            f"Run terminé : {nb_messages} email(s) initial(aux), {nb_relances} relance(s).",
            {"worker_id": worker_id, "nb_messages": nb_messages, "nb_relances": nb_relances, "team_id": team_id},
        )


if __name__ == "__main__":
    main()
