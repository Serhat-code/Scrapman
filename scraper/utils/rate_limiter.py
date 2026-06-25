"""Limiteur de débit asynchrone simple, basé sur un intervalle minimal entre appels."""

from __future__ import annotations

import asyncio
import time


class RateLimiter:
    """Garantit un intervalle minimal entre deux appels successifs.

    Usage::

        limiter = RateLimiter(max_par_seconde=4)
        await limiter.attendre()
        # ... appel API ...
    """

    def __init__(self, max_par_seconde: float) -> None:
        if max_par_seconde <= 0:
            raise ValueError("max_par_seconde doit être > 0")
        self._intervalle = 1.0 / max_par_seconde
        self._dernier_appel: float = 0.0
        self._lock = asyncio.Lock()

    async def attendre(self) -> None:
        """Bloque si nécessaire pour respecter l'intervalle minimal configuré."""
        async with self._lock:
            maintenant = time.monotonic()
            attente = self._dernier_appel + self._intervalle - maintenant
            if attente > 0:
                await asyncio.sleep(attente)
            self._dernier_appel = time.monotonic()
