"""Krishvedi Farms hosted upload - saves to database instead of session."""

from __future__ import annotations
import traceback
import logging
import json

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

from app.database import save_report, get_report
from app.services.parser_krishvedi import (
    parse_krishvedi,
    aggregate_krishvedi,
    get_monthly_summary,
)

router = APIRouter(prefix="/api/data", tags=["Data"])


@router.post("/upload")
async def upload_file(
    data_file: UploadFile = File(...),
    month: str = Form("auto"),
):
    """Upload Excel file - saves to database permanently."""
    try:
        # Read file bytes
        file_bytes = await data_file.read()
        
        # Parse
        df, warnings = parse_krishvedi(file_bytes)
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="File appears empty or unreadable.",
            )
        
        # Auto-detect months
        detected_months: set[str] = set()
        if "Month" in df.columns:
            detected_months.update(df["Month"].dropna().unique().tolist())
        
        if month != "auto" and len(month) == 7 and month[4] == "-":
            months_to_process = [month]
        elif detected_months:
            months_to_process = sorted(detected_months)
        else:
            raise HTTPException(
                status_code=400,
                detail="Could not detect any months from the data.",
            )
        
        # Store data in database
        def convert_to_json_serializable(obj):
    import pandas as pd
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(i) for i in obj]
    return obj

data_to_store = {
    "months": months_to_process,
    "raw_data": convert_to_json_serializable(df.to_dict(orient="records")),
    "warnings": warnings,
}
        save_report(data_file.filename, json.dumps(data_to_store))
        
        return {
            "success": True,
            "filename": data_file.filename,
            "months": months_to_process,
            "total_rows": len(df),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get("/report")
def get_report_data():
    """Get stored report data."""
    report = get_report()
    if not report:
        return {"has_data": False, "message": "No report uploaded yet"}
    
    return {
        "has_data": True,
        "filename": report["filename"],
        "uploaded_at": report["uploaded_at"],
    }


@router.get("/overview")
def get_overview():
    """Get aggregated overview from stored data."""
    report = get_report()
    if not report:
        raise HTTPException(status_code=404, detail="No data found")
    
    data = json.loads(report["data_json"])
    df = pd.DataFrame(data["raw_data"])
    
    # Aggregate similar to the original
    aggregated = aggregate_krishvedi(df)
    
    months = data.get("months", [])
    current_month = months[0] if months else None
    
    # Build overview
    sales_df = aggregated.get("sales", pd.DataFrame())
    purchases_df = aggregated.get("purchases", pd.DataFrame())
    consumption_df = aggregated.get("consumption", pd.DataFrame())
    
    total_sales = sales_df["sales"].sum() if not sales_df.empty and "sales" in sales_df.columns else 0
    total_purchase = purchases_df["purchase"].sum() if not purchases_df.empty and "purchase" in purchases_df.columns else 0
    consumption = consumption_df["consumption"].sum() if not consumption_df.empty and "consumption" in consumption_df.columns else 0
    
    # Calculate opening/closing (simplified)
    opening_balance = max(0, total_purchase - consumption - total_sales)
    closing_balance = max(0, total_purchase - consumption)
    gross_profit = total_sales - (total_purchase - consumption)
    
    unique_parties = df["Party"].nunique() if "Party" in df.columns else 0
    unique_items = df["Items"].nunique() if "Items" in df.columns else 0
    
    return {
        "has_data": True,
        "months": months,
        "current_month": current_month,
        "monthly": [
            {
                "month": m,
                "sales": total_sales,
                "purchases": total_purchase,
                "consumption": consumption,
                "opening_balance": opening_balance,
                "closing_balance": closing_balance,
                "gross_profit": gross_profit,
                "unique_parties": unique_parties,
                "unique_items": unique_items,
            }
            for m in months
        ],
    }


@router.get("/items")
def get_items(month: str = "all"):
    """Get items data from stored report."""
    report = get_report()
    if not report:
        raise HTTPException(status_code=404, detail="No data found")
    
    data = json.loads(report["data_json"])
    df = pd.DataFrame(data["raw_data"])
    aggregated = aggregate_krishvedi(df)
    
    items_df = aggregated.get("sales", pd.DataFrame())
    if items_df.empty:
        return {"items": []}
    
    items = items_df.to_dict(orient="records")
    return {"items": items}


@router.get("/parties")
def get_parties(month: str = "all"):
    """Get parties data from stored report."""
    report = get_report()
    if not report:
        raise HTTPException(status_code=404, detail="No data found")
    
    data = json.loads(report["data_json"])
    df = pd.DataFrame(data["raw_data"])
    
    # Aggregate by party
    if "Party" not in df.columns:
        return {"parties": []}
    
    parties_agg = df.groupby("Party").agg({
        "Gross Value": "sum",
        "Consumption": "sum",
    }).reset_index()
    
    parties_agg.columns = ["party", "sales", "purchase"]
    parties_agg["gross_profit"] = parties_agg["sales"] - parties_agg["purchase"]
    parties_agg["margin"] = (parties_agg["gross_profit"] / parties_agg["sales"] * 100).round(1)
    
    return {"parties": parties_agg.to_dict(orient="records")}
