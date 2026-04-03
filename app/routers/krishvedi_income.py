"""Krishvedi Farms income statement endpoint."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

from app.models.session import store


router = APIRouter()


@router.get("/krishvedi/income-statement")
async def krishvedi_income_statement(
    session_id: str = Query(...),
    month: str | None = Query(None),
) -> dict[str, Any]:
    """Get income statement for Krishvedi data."""
    if not session_id:
        return {"months": [], "error": "session_id required"}

    session = store.get(session_id)
    if not session:
        return {"error": "Session not found", "months": []}

    if not session.months:
        return {"error": "No data", "months": []}

    all_months = sorted(session.months.keys())
    months_to_show = [month] if month and month in session.months else all_months

    result = {"months": months_to_show, "statement": []}

    for m in months_to_show:
        if m not in session.months:
            continue

        rd = session.months[m].krishvedi_raw
        if rd.empty:
            continue

        # Get values by category
        sales = rd[rd["Category"] == "sale"]["Value_1"].sum() if "Value_1" in rd.columns else 0
        purchases = rd[rd["Category"] == "purchase"]["Value"].sum() if "Value" in rd.columns else 0
        consumption = rd[rd["Category"] == "consumption"]["Consumption"].sum() if "Consumption" in rd.columns else 0

        # Get opening balance
        opening_balance = 0
        if "Balance" in rd.columns and "Vch Type" in rd.columns:
            opening_rows = rd[rd["Vch Type"] == "Opening Balance"]
            opening_balance = opening_rows["Balance"].sum() if not opening_rows.empty else 0

        # If no opening balance, get from previous month
        if opening_balance == 0:
            idx = all_months.index(m)
            if idx > 0:
                for pm in all_months[:idx]:
                    pm_data = session.months[pm].krishvedi_raw
                    if "Vch Type" in pm_data.columns and "Balance" in pm_data.columns:
                        pm_closing = pm_data[pm_data["Vch Type"] == "Balance"]["Balance"].sum()
                        if pm_closing != 0:
                            opening_balance = pm_closing
                            break

        # Get closing balance
        closing_balance = 0
        if "Balance" in rd.columns and "Vch Type" in rd.columns:
            balance_rows = rd[rd["Vch Type"] == "Balance"]
            closing_balance = balance_rows["Balance"].sum() if not balance_rows.empty else 0

        # Calculate Gross Profit = Opening + Purchases - Sales - Closing
        gross_profit = opening_balance + purchases - sales - closing_balance

        # Gross Profit % = (Gross Profit / Sales) * 100
        gross_profit_pct = (gross_profit / sales * 100) if sales > 0 else 0

        result["statement"].append({
            "month": m,
            "opening_stock": opening_balance,
            "purchases": purchases,
            "consumption": consumption,
            "sales": sales,
            "closing_stock": closing_balance,
            "gross_profit": gross_profit,
            "gross_profit_pct": gross_profit_pct,
        })

    return result