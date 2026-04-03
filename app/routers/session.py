"""Session management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import DeleteResponse, SessionStatusResponse
from app.models.session import store

router = APIRouter(prefix="/session")


@router.get("/status", response_model=SessionStatusResponse)
async def session_status(session_id: str = Query(...)) -> SessionStatusResponse:
    """Get session status and loaded months."""
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return SessionStatusResponse(
        session_id=session.session_id,
        months_loaded=sorted(session.months.keys()),
        created_at=session.created_at,
        last_accessed=session.last_accessed,
    )


@router.delete("", response_model=DeleteResponse)
async def delete_session(session_id: str = Query(...)) -> DeleteResponse:
    """Delete a session and free its data."""
    deleted = store.delete(session_id)
    return DeleteResponse(deleted=deleted)
