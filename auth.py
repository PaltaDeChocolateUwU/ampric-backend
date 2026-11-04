import time
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import SUPABASE_KEY, SUPABASE_URL

_esquema = HTTPBearer(auto_error=False)
_cache: dict[str, tuple[float, str]] = {}  # token -> (vence, user_id)
TTL_SEGUNDOS = 60


def usuario_actual(cred: Optional[HTTPAuthorizationCredentials] = Depends(_esquema)) -> str:
    """Devuelve el id (uuid) del usuario dueño del token, o responde 401."""
    if cred is None:
        raise HTTPException(401, "Debes iniciar sesión")
    token = cred.credentials
    ahora = time.time()

    hit = _cache.get(token)
    if hit and hit[0] > ahora:
        return hit[1]

    try:
        r = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_KEY},
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(503, "No se pudo validar la sesión, inténtalo de nuevo")

    user_id = r.json().get("id") if r.status_code == 200 else None
    if not user_id:
        raise HTTPException(401, "Sesión inválida o vencida")

    if len(_cache) > 500:
        _cache.clear()
    _cache[token] = (ahora + TTL_SEGUNDOS, user_id)
    return user_id