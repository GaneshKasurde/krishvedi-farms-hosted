"""File upload endpoint."""

from __future__ import annotations

import traceback
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

from app.models.schemas import UploadResponse, UploadSummary
from app.models.session import MonthData, store
from app.services.aggregator import (
    aggregate_consumption,
    aggregate_purchase,
    aggregate_sales,
)
from app.services.cost_engine import compute_cost_allocation
from app.services.parser import parse_consumption, parse_purchase, parse_sales
from app.services.profitability import compute_profitability

router = APIRouter()


@router.post("/upload")
async def upload_files(
    purchase_file: UploadFile = File(...),
    sales_file: UploadFile = File(...),
    consumption_file: UploadFile = File(...),
    month: str = Form("auto"),
    session_id: str | None = Form(None),
):
    """Upload 3 Excel files and process them.

    If month is 'auto', all months found in the data are processed.
    Otherwise, only the specified month is processed.
    """
    try:
        return await _process_upload(purchase_file, sales_file, consumption_file, month, session_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload processing failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def _process_upload(
    purchase_file: UploadFile,
    sales_file: UploadFile,
    consumption_file: UploadFile,
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
    purchase_bytes = await purchase_file.read()
    sales_bytes = await sales_file.read()
    consumption_bytes = await consumption_file.read()

    # Parse
    purchase_df, p_warnings = parse_purchase(purchase_bytes)
    sales_df, s_warnings = parse_sales(sales_bytes)
    consumption_df, c_warnings = parse_consumption(consumption_bytes)

    all_warnings = p_warnings + s_warnings + c_warnings

    if purchase_df.empty and sales_df.empty and consumption_df.empty:
        raise HTTPException(
            status_code=400,
            detail=f"All files appear empty or unreadable. Warnings: {all_warnings}",
        )

    # Auto-detect months from data
    detected_months: set[str] = set()
    for df in [purchase_df, sales_df, consumption_df]:
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
        # Aggregate
        purchase_agg = aggregate_purchase(purchase_df, m)
        sales_agg = aggregate_sales(sales_df, m)
        consumption_agg = aggregate_consumption(consumption_df, m)

        # Cost allocation
        cost_allocation = compute_cost_allocation(purchase_agg, consumption_agg)

        # Profitability
        profitability = compute_profitability(sales_agg, cost_allocation)

        # Store in session
        month_data = MonthData(
            month=m,
            purchase_raw=purchase_df[purchase_df.get("Month") == m] if "Month" in purchase_df.columns else purchase_df,
            sales_raw=sales_df[sales_df.get("Month") == m] if "Month" in sales_df.columns else sales_df,
            consumption_raw=consumption_df[consumption_df.get("Month") == m] if "Month" in consumption_df.columns else consumption_df,
            purchase_agg=purchase_agg,
            sales_agg=sales_agg,
            consumption_agg=consumption_agg,
            cost_allocation=cost_allocation,
            profitability=profitability,
            warnings=all_warnings,
        )
        session.months[m] = month_data
        processed_months.append(m)

    # Build summary using the first month's data for counts
    summary = UploadSummary(
        purchase_rows=len(purchase_df),
        sales_rows=len(sales_df),
        consumption_rows=len(consumption_df),
        unique_grades=sales_df["Grade"].nunique() if "Grade" in sales_df.columns else 0,
        unique_customers=sales_df["PartyName"].nunique() if "PartyName" in sales_df.columns else 0,
        unique_materials=purchase_df["ItemName"].nunique() if "ItemName" in purchase_df.columns else 0,
    )

    return {
        "session_id": session.session_id,
        "month": processed_months[0] if len(processed_months) == 1 else processed_months[0],
        "months": processed_months,
        "summary": summary.model_dump(),
        "validation_warnings": all_warnings,
    }
