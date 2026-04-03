"""In-memory session store for uploaded and processed data."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from app.config import SESSION_EXPIRY_MINUTES


@dataclass
class MonthData:
    """Holds raw and aggregated data for a single month."""

    month: str  # YYYY-MM

    # Raw DataFrames
    purchase_raw: pd.DataFrame = field(default_factory=pd.DataFrame)
    sales_raw: pd.DataFrame = field(default_factory=pd.DataFrame)
    consumption_raw: pd.DataFrame = field(default_factory=pd.DataFrame)
    direct_expenses_raw: pd.DataFrame = field(default_factory=pd.DataFrame)
    indirect_expenses_raw: pd.DataFrame = field(default_factory=pd.DataFrame)
    other_income_raw: pd.DataFrame = field(default_factory=pd.DataFrame)

    # Krishvedi format - single sheet
    krishvedi_raw: pd.DataFrame = field(default_factory=pd.DataFrame)

    # Aggregated DataFrames
    purchase_agg: pd.DataFrame = field(default_factory=pd.DataFrame)
    sales_agg: pd.DataFrame = field(default_factory=pd.DataFrame)
    consumption_agg: pd.DataFrame = field(default_factory=pd.DataFrame)
    direct_expenses_agg: pd.DataFrame = field(default_factory=pd.DataFrame)
    indirect_expenses_agg: pd.DataFrame = field(default_factory=pd.DataFrame)

    # Cost allocation
    cost_allocation: pd.DataFrame = field(default_factory=pd.DataFrame)
    profitability: pd.DataFrame = field(default_factory=pd.DataFrame)

    # Validation warnings
    warnings: list[str] = field(default_factory=list)


@dataclass
class Session:
    """Represents a user session with uploaded data."""

    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    months: dict[str, MonthData] = field(default_factory=dict)
    anon_mappings: dict[str, Any] | None = None  # Stored when anonymized export is done

    def touch(self) -> None:
        self.last_accessed = time.time()

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.last_accessed) > SESSION_EXPIRY_MINUTES * 60


class SessionStore:
    """Thread-safe in-memory session store."""

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self) -> Session:
        session = Session()
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if session.is_expired:
            self.delete(session_id)
            return None
        session.touch()
        return session

    def delete(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def cleanup_expired(self) -> int:
        expired = [sid for sid, s in self._sessions.items() if s.is_expired]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)

    def list_sessions(self) -> list[str]:
        return list(self._sessions.keys())


# Global singleton
store = SessionStore()
