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
    """Application lifespan: start background cleanup task."""
    init_db()
    task = asyncio.create_task(_cleanup_loop())
    logger.info("Krishvedi Farms Backend started")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Krishvedi Farms Backend stopped")


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

# Register routers - auth and hosted_data have their own /api prefix
app.include_router(auth.router, tags=["Authentication"])
app.include_router(hosted_data.router, tags=["Data"])
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
