"""FastAPI application entry point with CORS, lifespan, and router registration."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SESSION_CLEANUP_INTERVAL_SECONDS
from app.models.session import store
from app.database import init_db
from dotenv import load_dotenv
load_dotenv()

from app.routers import auth, hosted_data, analysis, expenses, insights, report, session, upload, upload_krishvedi, analysis_krishvedi, krishvedi_income

logger = logging.getLogger("krishvedi-farms-hosted")


async def _cleanup_loop() -> None:
    """Periodically clean up expired sessions."""
    while True:
        await asyncio.sleep(SESSION_CLEANUP_INTERVAL_SECONDS)
        count = store.cleanup_expired()
        if count > 0:
            logger.info(f"Cleaned up {count} expired session(s)")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: start background tasks."""
    # Initialize database
    logger.info("Database initialized")
    
    # Start cleanup task
    task = asyncio.create_task(_cleanup_loop())
    logger.info("Krishvedi Farms Hosted backend started")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Krishvedi Farms Hosted backend stopped")


app = FastAPI(
    title="Krishvedi Farms Hosted",
    description="Krishvedi Farms Sales Analysis - Hosted Version",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api prefix
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(hosted_data.router, prefix="/api", tags=["Data"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(upload_krishvedi.router, prefix="/api", tags=["Krishvedi Upload"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(analysis_krishvedi.router, prefix="/api", tags=["Krishvedi Analysis"])
app.include_router(krishvedi_income.router, prefix="/api", tags=["Krishvedi Income"])
app.include_router(report.router, prefix="/api", tags=["Report"])
app.include_router(insights.router, prefix="/api", tags=["AI Insights"])
app.include_router(session.router, prefix="/api", tags=["Session"])
app.include_router(expenses.router, prefix="/api", tags=["Expenses"])


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}

@app.post("/api/test-post")
async def test_post():
    return {"success": True, "message": "POST works!"}
# Serve frontend static files in production / desktop mode
# Look for the built frontend in several possible locations
def _find_frontend_dist() -> Path | None:
    candidates = [
        # Development: frontend/dist relative to backend/
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
        # Desktop/PyInstaller: renderer/ next to the executable
        Path(sys.executable).parent / "renderer",
        # Desktop: resources/renderer
        Path(getattr(sys, "_MEIPASS", ".")) / "renderer",
    ]
    for p in candidates:
        if p.is_dir() and (p / "index.html").exists():
            return p
    return None


_frontend_dir = _find_frontend_dist()
if _frontend_dir:
    # Serve index.html for all non-API routes (SPA fallback)
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = _frontend_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dir / "index.html")

    logger.info(f"Serving frontend from {_frontend_dir}")
