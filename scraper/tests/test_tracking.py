"""Suivi d'ouverture : corps HTML et pixel.

Ces tests couvrent précisément ce qui manquait quand 109 emails sont partis
pour 0 ouverture recensée : la présence effective du pixel dans le HTML, et le
fait que le corps texte soit bien doublé d'une partie HTML.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.tracking import corps_en_html, url_pixel  # noqa: E402


def test_url_pixel_cible_la_ligne_de_journal_et_l_equipe():
    url = url_pixel("11111111-2222-3333-4444-555555555555", "aaaa-bbbb")
    assert "/api/track/open?" in url
    assert "sid=11111111-2222-3333-4444-555555555555" in url
    assert "tid=aaaa-bbbb" in url


def test_corps_en_html_insere_le_pixel():
    html = corps_en_html("Bonjour,\n\nUne proposition.", url_pixel("sid-1", "team-1"))
    assert "<img" in html
    assert "sid-1" in html
    assert 'width="1"' in html


def test_corps_en_html_sans_pixel_n_en_met_aucun():
    html = corps_en_html("Bonjour,\n\nUne proposition.")
    assert "<img" not in html


def test_paragraphes_separes_sur_ligne_vide():
    html = corps_en_html("Premier.\n\nSecond.")
    assert html.count("<p ") == 2


def test_simple_retour_ligne_devient_br():
    html = corps_en_html("Ligne A\nLigne B")
    assert "<br>" in html
    assert html.count("<p ") == 1


def test_le_corps_est_echappe_avant_insertion():
    """Un corps contenant du HTML ne doit pas pouvoir casser le document."""
    html = corps_en_html("<script>alert(1)</script> & fin")
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&amp; fin" in html


def test_l_url_du_pixel_est_echappee_dans_l_attribut():
    html = corps_en_html("Bonjour", 'https://x.fr/a?b=1&c="2"')
    assert '&amp;c=' in html
    assert '&quot;' in html
