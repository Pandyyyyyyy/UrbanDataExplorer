"""Authentification optionnelle et quotas API (gouvernance)."""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Callable, Deque, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

UDE_API_KEY = os.getenv("UDE_API_KEY", "").strip()
API_RATE_LIMIT = int(os.getenv("API_RATE_LIMIT", "120"))  # requêtes / minute / IP
API_RATE_WINDOW_SEC = int(os.getenv("API_RATE_WINDOW_SEC", "60"))

PUBLIC_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/platform/freshness",
}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _extract_api_key(request: Request) -> Optional[str]:
    header = request.headers.get("x-api-key") or request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return request.headers.get("x-api-key") or request.query_params.get("api_key")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Quota simple par IP (fenêtre glissante en mémoire)."""

    def __init__(self, app, limit: int = API_RATE_LIMIT, window_sec: int = API_RATE_WINDOW_SEC):
        super().__init__(app)
        self.limit = limit
        self.window_sec = window_sec
        self._hits: Dict[str, List[float]] = defaultdict(list)

    def _allow(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - self.window_sec
        hits = [t for t in self._hits[key] if t > window_start]
        if len(hits) >= self.limit:
            self._hits[key] = hits
            return False, 0
        hits.append(now)
        self._hits[key] = hits
        return True, self.limit - len(hits)

    async def dispatch(self, request: Request, call_next: Callable):
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        ip = _client_ip(request)
        allowed, remaining = self._allow(ip)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Quota dépassé : {self.limit} requêtes / {self.window_sec}s par IP",
                    "retry_after_sec": self.window_sec,
                },
                headers={"Retry-After": str(self.window_sec), "X-RateLimit-Limit": str(self.limit)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Clé API optionnelle (UDE_API_KEY). Si vide, auth désactivée (démo locale)."""

    async def dispatch(self, request: Request, call_next: Callable):
        if not UDE_API_KEY or request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        key = _extract_api_key(request)
        if key != UDE_API_KEY:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Clé API requise : header X-API-Key ou ?api_key= (voir /platform/governance)",
                },
            )
        return await call_next(request)


def governance_quotas_doc() -> Dict[str, object]:
    return {
        "auth": {
            "active": bool(UDE_API_KEY),
            "header": "X-API-Key",
            "query_param": "api_key",
            "note": "Désactivée si UDE_API_KEY non défini (développement)",
        },
        "rate_limit": {
            "limit_per_ip": API_RATE_LIMIT,
            "window_sec": API_RATE_WINDOW_SEC,
            "headers": ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
        },
        "sql_governance": {
            "role_lecture": "ude_reader",
            "droits": "SELECT uniquement sur vues et tables métier",
        },
    }
