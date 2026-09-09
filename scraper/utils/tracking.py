"""Suivi d'ouverture des emails : corps HTML + pixel transparent.

Pourquoi ici et pas côté Next.js — il existait bien un `injectTrackingPixel()`
dans `frontend/src/lib/email/tracking.ts`, mais il n'avait aucun appelant et ne
pouvait pas en avoir : l'envoi réel est fait par ce worker Python, jamais par le
frontend. Résultat, 109 emails envoyés pour 0 ouverture recensée.

Deuxième cause du même bug : les emails partaient en `MIMEText(corps, "plain")`.
Un email sans partie HTML ne peut pas porter d'image, donc pas de pixel — même
en corrigeant l'injection. D'où la partie HTML ajoutée dans `envoyer_smtp`.

Ce que ce suivi vaut réellement : un pixel ne mesure jamais juste. Gmail
proxifie et met en cache les images, Apple Mail Privacy Protection les précharge
toutes (faux positifs), et beaucoup de clients les bloquent (faux négatifs).
C'est un indicateur de tendance, pas un taux exact — ne pas le présenter comme
une vérité à l'utilisateur.
"""

from __future__ import annotations

import html
from urllib.parse import urlencode

from config import APP_URL


def url_pixel(send_log_id: str, team_id: str) -> str:
    """URL du pixel pour une ligne `send_logs` précise.

    On adresse la ligne de journal (`sid`) et non le message : une relance
    partage le `message_id` de l'envoi d'origine, donc cibler le message
    marquerait les deux lignes d'un coup.
    """
    params = urlencode({"sid": send_log_id, "tid": team_id})
    return f"{APP_URL.rstrip('/')}/api/track/open?{params}"


def corps_en_html(corps: str, pixel_url: str | None = None) -> str:
    """Convertit le corps texte en HTML simple, avec le pixel en fin de document.

    Volontairement minimal : les clients mail ignorent la moitié du CSS et les
    balises exotiques déclenchent les filtres anti-spam. Paragraphes sur ligne
    vide, `<br>` sur simple retour, et c'est tout.
    """
    blocs = [b for b in corps.replace("\r\n", "\n").split("\n\n")]
    paragraphes = []
    for bloc in blocs:
        if not bloc.strip():
            continue
        # L'échappement passe AVANT l'insertion des <br> : sinon un corps
        # contenant "<" casserait le document (et ouvrirait une injection).
        contenu = html.escape(bloc.strip()).replace("\n", "<br>")
        paragraphes.append(
            f'<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#08192b;">{contenu}</p>'
        )

    pixel = ""
    if pixel_url:
        pixel = (
            f'<img src="{html.escape(pixel_url, quote=True)}" width="1" height="1" '
            'style="display:block;border:0;outline:0;opacity:0;height:1px;width:1px;" alt="">'
        )

    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;padding:0;background:#ffffff;'
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;\">"
        '<div style="max-width:560px;margin:0 auto;padding:8px 0;">'
        f'{"".join(paragraphes)}{pixel}'
        "</div></body></html>"
    )
