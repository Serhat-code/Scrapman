"""Configuration du logging console via `rich`."""

from __future__ import annotations

import logging

from rich.logging import RichHandler

_CONFIGURE = False


def get_logger(name: str = "scrapman") -> logging.Logger:
    """Retourne un logger configuré avec un rendu console `rich`."""
    global _CONFIGURE

    if not _CONFIGURE:
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(rich_tracebacks=True, show_path=False)],
        )
        _CONFIGURE = True

    return logging.getLogger(name)
