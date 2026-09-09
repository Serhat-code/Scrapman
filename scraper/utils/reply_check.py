"""Détection des réponses par relève IMAP.

Le worker savait déjà annuler une relance quand le message d'origine portait un
`reply_detected_at` (cf. `doit_ignorer_relance`) — mais rien n'écrivait jamais
ce champ. Le garde-fou existait sans être armé : un prospect qui répondait
continuait de recevoir les relances programmées. C'est le défaut le plus coûteux
de l'application, parce qu'il n'abîme rien techniquement mais brûle la relation
commerciale.

Principe : on relit les en-têtes `In-Reply-To` / `References` des messages reçus
récemment et on les rapproche des `provider_message_id` posés à l'envoi. Aucun
contenu de message n'est lu ni stocké — uniquement les en-têtes de corrélation.

Entièrement optionnel. Sans `imap_host` sur le profil expéditeur, la relève est
sautée et le comportement reste strictement identique à avant.
"""

from __future__ import annotations

import email
import imaplib
import ssl
from datetime import datetime, timedelta, timezone
from typing import Any

from rich.console import Console

console = Console()

# Fenêtre de relève. Au-delà, on considère que la réponse est arrivée trop tard
# pour que la relance soit encore en jeu — et on évite de reparcourir toute la
# boîte de réception à chaque passage.
FENETRE_JOURS = 14

# Garde-fou : une boîte de réception peut contenir des dizaines de milliers de
# messages. On plafonne pour qu'un run ne parte jamais en vrille.
MAX_MESSAGES_RELEVES = 500


def imap_configure(profile: dict[str, Any] | None) -> bool:
    """La relève n'est tentée que si l'équipe a renseigné un serveur IMAP."""
    return bool(profile and profile.get("imap_host") and profile.get("smtp_user"))


def _referenced_ids(msg: Any) -> set[str]:
    """Extrait les Message-Id auxquels ce mail répond.

    `In-Reply-To` porte le parent direct, `References` toute la chaîne. Les deux
    sont consultés : certains clients ne remplissent que l'un des deux.
    """
    ids: set[str] = set()
    for entete in ("In-Reply-To", "References"):
        brut = msg.get(entete)
        if not brut:
            continue
        for jeton in brut.replace(",", " ").split():
            jeton = jeton.strip().strip("<>")
            if jeton:
                # Les Message-Id sont stockés avec leurs chevrons en base
                # (make_msgid en produit ainsi) : on garde les deux formes.
                ids.add(jeton)
                ids.add(f"<{jeton}>")
    return ids


def relever_reponses(profile: dict[str, Any], password: str) -> set[str]:
    """Retourne les `provider_message_id` auxquels quelqu'un a répondu.

    Ne lève jamais : une boîte injoignable ne doit pas empêcher les envois.
    """
    host = profile["imap_host"]
    port = int(profile.get("imap_port") or 993)
    secure = profile.get("imap_secure", True)
    depuis = (datetime.now(timezone.utc) - timedelta(days=FENETRE_JOURS)).strftime("%d-%b-%Y")

    repondus: set[str] = set()
    client: Any = None
    try:
        if secure:
            client = imaplib.IMAP4_SSL(host, port, ssl_context=ssl.create_default_context(), timeout=20)
        else:
            client = imaplib.IMAP4(host, port, timeout=20)
            client.starttls(ssl_context=ssl.create_default_context())

        client.login(profile["smtp_user"], password)
        client.select("INBOX", readonly=True)

        statut, data = client.search(None, "SINCE", depuis)
        if statut != "OK" or not data or not data[0]:
            return repondus

        numeros = data[0].split()[-MAX_MESSAGES_RELEVES:]
        for numero in numeros:
            # On ne demande QUE les en-têtes de corrélation : ni sujet, ni
            # corps, ni pièce jointe ne transitent.
            statut, contenu = client.fetch(numero, "(BODY.PEEK[HEADER.FIELDS (IN-REPLY-TO REFERENCES)])")
            if statut != "OK" or not contenu or not contenu[0]:
                continue
            brut = contenu[0][1]
            if not isinstance(brut, (bytes, bytearray)):
                continue
            repondus |= _referenced_ids(email.message_from_bytes(bytes(brut)))

        return repondus
    except Exception as exc:  # noqa: BLE001 - la relève ne doit jamais bloquer l'envoi
        console.print(f"[yellow]Relève IMAP impossible ({host}) : {exc}[/yellow]")
        return repondus
    finally:
        if client is not None:
            try:
                client.logout()
            except Exception:  # noqa: BLE001 - fermeture best-effort
                pass


def marquer_reponses(client: Any, team_id: str, provider_ids: set[str]) -> int:
    """Marque les messages répondus et annule leurs relances encore planifiées.

    Retourne le nombre de messages nouvellement marqués.
    """
    if not provider_ids:
        return 0

    # On ne repasse pas sur ce qui est déjà marqué : `statut = 'envoye'` suffit
    # comme filtre, un message déjà 'repondu' n'a plus rien à apprendre.
    resp = (
        client.table("messages")
        .select("id, provider_message_id")
        .eq("team_id", team_id)
        .eq("statut", "envoye")
        .in_("provider_message_id", sorted(provider_ids))
        .execute()
    )
    messages = resp.data or []
    if not messages:
        return 0

    maintenant = datetime.now(timezone.utc).isoformat()
    ids = [m["id"] for m in messages]

    client.table("messages").update(
        {"statut": "repondu", "reply_detected_at": maintenant}
    ).in_("id", ids).execute()

    # Sans cette annulation, la relance déjà planifiée partirait quand même :
    # c'est exactement le scénario que la détection cherche à empêcher.
    client.table("sequences").update({"statut": "annule"}).in_(
        "original_message_id", ids
    ).eq("statut", "planifie").execute()

    return len(ids)
