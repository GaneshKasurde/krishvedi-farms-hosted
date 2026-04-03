"""Krishvedi Farms single-sheet file upload endpoint."""

from __future__ import annotations

import traceback
import logging

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

from app.models.schemas import UploadResponse, UploadSummary
from app.models.session import MonthData, store
from app.services.parser_krishvedi import (
    parse_krishvedi,
    aggregate_krishvedi,
    get_monthly_summary,
)

router = APIRouter()


@router.post("/upload-krishvedi")
async def upload_krishvedi_file(
    data_file: UploadFile = File(...),
    month: str = Form("auto"),
    session_id: str | None = Form(None),
):
    """Upload single Excel file for Krishvedi Farms format."""
    try:
        return await _process_upload(data_file, month, session_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Krishvedi upload processing failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def _process_upload(
    data_file: UploadFile,
    month: str,
    session_id: str | None,
):
    # Get or create session
    session = None
    if session_id:
        session = store.get(session_id)
    if session is None:
        session = store.create()

    # Read file bytes
    file_bytes = await data_file.read()

    # Parse
    print("DEBUG: Starting parse_krishvedi...")
    df, warnings = parse_krishvedi(file_bytes)
    print("DEBUG: Parse complete, df shape:", df.shape)
    print("DEBUG: Warnings:", warnings)

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="File appears empty or unreadable. Warnings: " + ", ".join(warnings),
        )

    # Auto-detect months from data
    detected_months: set[str] = set()
    
    print("DEBUG: df columns:", list(df.columns))
    print("DEBUG: Date column exists:", "Date" in df.columns)
    if "Date" in df.columns:
        print("DEBUG: Date sample:", df["Date"].head(3).tolist())
    print("DEBUG: Month column exists:", "Month" in df.columns)
    if "Month" in df.columns:
        print("DEBUG: Month sample:", df["Month"].head(3).tolist())
        print("DEBUG: Month unique:", df["Month"].unique().tolist()[:5])
    
    if "Month" in df.columns:
        detected_months.update(df["Month"].dropna().unique().tolist())

    if month != "auto" and len(month) == 7 and month[4] == "-":
        months_to_process = [month]
    elif detected_months:
        months_to_process = sorted(detected_months)
    else:
        raise HTTPException(
            status_code=400,
            detail="Could not detect any months from the data. Check date columns.",
        )

    processed_months: list[str] = []

    for m in months_to_process:
        # Filter data for this month
        month_df = df[df.get("Month") == m] if "Month" in df.columns else df

        # Aggregate
        aggregated = aggregate_krishvedi(month_df)

        # Store in session
        month_data = MonthData(
            month=m,
            krishvedi_raw=month_df,
            sales_agg=aggregated.get("sales", pd.DataFrame()),
            purchase_agg=aggregated.get("purchases", pd.DataFrame()),
            consumption_agg=aggregated.get("consumption", pd.DataFrame()),
            warnings=warnings,
        )
        session.months[m] = month_data
        processed_months.append(m)

    # Get summary
    summary_data = get_monthly_summary(df)

    return {
        "session_id": session.session_id,
        "month": processed_months[0] if len(processed_months) == 1 else processed_months[0],
        "months": processed_months,
        "summary": {
            "total_rows": len(df),
            "unique_items": df["Items"].nunique() if "Items" in df.columns else 0,
            "unique_parties": df["Party"].nunique() if "Party" in df.columns else 0,
            "months_processed": len(processed_months),
        },
        "validation_warnings": warnings,
    }
