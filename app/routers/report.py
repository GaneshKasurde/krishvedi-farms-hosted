"""PDF report and data export endpoints."""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from app.models.session import store
from app.services.anonymizer import anonymize_and_export, deanonymize_text
from app.services.pdf_generator import generate_pdf

router = APIRouter(prefix="/report")


@router.get("/pdf")
async def download_pdf(
    session_id: str = Query(...),
    month: str = Query(...),
) -> Response:
    """Generate and download PDF report for a given month."""
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if month not in session.months:
        raise HTTPException(
            status_code=404,
            detail=f"Month {month} not loaded. Available: {list(session.months.keys())}",
        )

    month_data = session.months[month]
    pdf_bytes = generate_pdf(month_data, month)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="RMC_Report_{month}.pdf"',
        },
    )


@router.get("/anonymized")
async def download_anonymized(
    session_id: str = Query(...),
    month: str = Query(None),
) -> Response:
    """Export anonymized data as an Excel workbook.

    Strips all identifying information (party names, GST numbers, sites,
    invoice numbers, branch names). Scales financial values and volumes
    by a random factor. Shifts dates by a random offset.
    """
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    # Collect raw DataFrames across requested months
    if month and month in session.months:
        months_to_export = [month]
    else:
        months_to_export = sorted(session.months.keys())

    if not months_to_export:
        raise HTTPException(status_code=404, detail="No data loaded in session")

    purchase_frames = []
    sales_frames = []
    consumption_frames = []

    for m in months_to_export:
        md = session.months[m]
        if not md.purchase_raw.empty:
            purchase_frames.append(md.purchase_raw)
        if not md.sales_raw.empty:
            sales_frames.append(md.sales_raw)
        if not md.consumption_raw.empty:
            consumption_frames.append(md.consumption_raw)

    purchase_df = pd.concat(purchase_frames, ignore_index=True) if purchase_frames else pd.DataFrame()
    sales_df = pd.concat(sales_frames, ignore_index=True) if sales_frames else pd.DataFrame()
    consumption_df = pd.concat(consumption_frames, ignore_index=True) if consumption_frames else pd.DataFrame()

    excel_bytes, metadata, reverse_mappings = anonymize_and_export(
        purchase_df, sales_df, consumption_df
    )

    # Store reverse mappings in session for de-anonymization later
    session.anon_mappings = reverse_mappings

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="Anonymized_RMC_Data.xlsx"',
            "X-Anon-Scale-Factor": str(metadata["scale_factor"]),
            "X-Anon-Date-Shift-Days": str(metadata["date_shift_days"]),
        },
    )


@router.get("/anonymized/preview")
async def preview_anonymized(
    session_id: str = Query(...),
    month: str = Query(None),
) -> JSONResponse:
    """Preview what anonymization will do — returns metadata and sample rows."""
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if month and month in session.months:
        months_to_export = [month]
    else:
        months_to_export = sorted(session.months.keys())

    purchase_frames = []
    sales_frames = []
    consumption_frames = []

    for m in months_to_export:
        md = session.months[m]
        if not md.purchase_raw.empty:
            purchase_frames.append(md.purchase_raw)
        if not md.sales_raw.empty:
            sales_frames.append(md.sales_raw)
        if not md.consumption_raw.empty:
            consumption_frames.append(md.consumption_raw)

    purchase_df = pd.concat(purchase_frames, ignore_index=True) if purchase_frames else pd.DataFrame()
    sales_df = pd.concat(sales_frames, ignore_index=True) if sales_frames else pd.DataFrame()
    consumption_df = pd.concat(consumption_frames, ignore_index=True) if consumption_frames else pd.DataFrame()

    _, metadata, _ = anonymize_and_export(purchase_df, sales_df, consumption_df, seed=42)

    return JSONResponse({
        "metadata": metadata,
        "what_is_anonymized": {
            "replaced_with_pseudonyms": [
                "PartyName → Customer_001, Supplier_001",
                "SiteName/JobSite → Site_001",
                "Branch → Plant_A, Plant_B",
            ],
            "removed": ["GST_No", "HSNCode"],
            "sequential_ids": ["Invoice No", "RefNo", "No", "BatchNo", "PONO"],
            "scaled_by_factor": f"{metadata['scale_factor']}x",
            "dates_shifted_by": f"{metadata['date_shift_days']} days",
        },
        "preserved": [
            "RMC Grades (M-15, M-25, etc.)",
            "Material names (Cement, Fly Ash, etc.)",
            "UOM, TaxType, transaction types",
            "Ratios and relative proportions",
        ],
        "row_counts": {
            "purchase": len(purchase_df),
            "sales": len(sales_df),
            "consumption": len(consumption_df),
        },
    })


@router.post("/deanonymize")
async def deanonymize(
    session_id: str = Query(...),
    body: dict = Body(...),
) -> JSONResponse:
    """De-anonymize AI response text using stored reverse mappings.

    Replaces pseudonyms with real names, reverses scaled amounts,
    and shifts dates back to real dates.

    Body: { "text": "The AI response text to de-anonymize..." }
    """
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if session.anon_mappings is None:
        raise HTTPException(
            status_code=400,
            detail="No anonymization mappings found. Export anonymized data first.",
        )

    input_text = body.get("text", "")
    if not input_text:
        raise HTTPException(status_code=400, detail="No text provided")

    result = deanonymize_text(input_text, session.anon_mappings)

    return JSONResponse({
        "original": input_text,
        "deanonymized": result,
        "mappings_applied": {
            "names_in_map": len(session.anon_mappings.get("name_map", {})),
            "scale_factor": session.anon_mappings.get("scale_factor", 1.0),
            "date_shift_reversed_days": -session.anon_mappings.get("date_shift_days", 0),
        },
    })
