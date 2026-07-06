"""PRAHARI backend — FastAPI application entrypoint.

Single deployable service exposing the three PRAHARI modules behind one API.
The MVP collapses the production microservice topology (see docs/ARCHITECTURE.md)
into this one app so it runs on a free public URL and stays live for judging.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Sovereign AI for National Strategic Intelligence & Defense Readiness "
        "(Bangladesh). Modules: DRISHTI (geopolitical intelligence), RAKKHOK "
        "(asset readiness), SHOMUDRO (maritime awareness). Every AI output "
        "carries its evidence chain, confidence, and provenance."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"], summary="Service banner")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
        "modules": "drishti,rakkhok,shomudro",
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"], summary="Health check")
def health() -> dict[str, str]:
    """Liveness probe — used by the hosting platform and the demo smoke test."""
    return {"status": "ok", "environment": settings.environment}


# ─── Module routers are registered here as each module lands ──────────────
from app.modules.drishti.router import router as drishti_router  # noqa: E402
from app.modules.rakkhok.router import router as rakkhok_router  # noqa: E402

app.include_router(drishti_router)
app.include_router(rakkhok_router)
