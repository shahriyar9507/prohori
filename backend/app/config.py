"""Central configuration for the PRAHARI backend.

All settings come from environment variables (12-factor); secrets are never
hardcoded. Copy ``.env.example`` to ``.env`` for local development.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from the environment."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "PRAHARI — The Sentinel"
    app_version: str = "0.1.0"
    environment: str = "development"

    # CORS: comma-separated list of allowed origins for the React frontend.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # ─── DRISHTI ─────────────────────────────────────────────
    # Use live GDELT when True; otherwise serve the cached demo snapshot
    # (keeps the judged demo fast and immune to upstream outages).
    drishti_use_live_gdelt: bool = False
    gdelt_timeout_seconds: float = 15.0

    # ─── LLM provider (pluggable; sovereign-capable) ─────────
    # Point base_url at a local Ollama/vLLM endpoint for air-gapped use,
    # or a hosted OpenAI-compatible API. Empty api_key => deterministic
    # fallback brief (the app never breaks during judging).
    llm_api_key: str = ""
    # Defaults match the deployed provider (Gemini via its OpenAI-compatible
    # gateway — see render.yaml); any OpenAI-compatible endpoint works.
    llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    llm_model: str = "gemini-2.5-flash-lite"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
