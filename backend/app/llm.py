"""Pluggable, sovereign-capable LLM provider.

One thin wrapper over any OpenAI-compatible endpoint. Point it at a local
Ollama/vLLM server for air-gapped, in-country inference (design law #4), or at
a hosted API. If no provider is configured, `complete()` returns None and every
caller falls back to a deterministic, grounded output — so the demo never
depends on an external service being reachable.
"""
from __future__ import annotations

import asyncio

from app.config import get_settings


def is_enabled() -> bool:
    return get_settings().llm_enabled


async def complete(system: str, user: str, *, max_tokens: int = 700, temperature: float = 0.2) -> str | None:
    """Return the model's completion, or None if unavailable/failed.

    Callers MUST treat None as "use the deterministic fallback".
    """
    settings = get_settings()
    if not settings.llm_enabled:
        return None
    try:
        from openai import AsyncOpenAI  # imported lazily so the dep is optional
    except Exception:  # noqa: BLE001
        return None
    client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
    for attempt in range(3):
        try:
            resp = await client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return (resp.choices[0].message.content or "").strip() or None
        except Exception as exc:  # noqa: BLE001 — never break the request path on LLM failure
            msg = str(exc).lower()
            rate_limited = any(k in msg for k in ("429", "resource_exhausted", "rate", "quota"))
            if attempt < 2 and rate_limited:
                await asyncio.sleep(22 * (attempt + 1))  # back off, then retry
                continue
            return None
    return None
