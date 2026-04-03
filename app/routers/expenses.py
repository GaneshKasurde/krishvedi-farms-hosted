"""Expense upload and income statement endpoints."""

from __future__ import annotations

import traceback
import logging

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from app.models.schemas import UploadResponse
from app.models.session import store
from app.services.aggregator import aggregate_expenses
from app.services.parser import parse_direct_expenses, parse_indirect_expenses, parse_other_income

router = APIRouter()


@router.post("/expenses/upload")
async def upload_expenses(
    sales_file: UploadFile | None = File(default=None),
    purchase_file: UploadFile | None = File(default=None),
    consumption_file: UploadFile | None = File(default=None),
    direct_file: UploadFile | None = File(default=None),
    indirect_file: UploadFile | None = File(default=None),
    other_income_file: UploadFile | None = File(default=None),
    month: str = Form("auto"),
    session_id: str | None = Form(None),
):
    """Upload Sales, Purchase, Consumption, Direct/Indirect expenses and Other Income Excel files."""
    try:
        return await _process_expense_upload(
            sales_file, purchase_file, consumption_file,
            direct_file, indirect_file, other_income_file,
            month, session_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Expense upload processing failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


async def _process_expense_upload(
    sales_file: UploadFile | None,
    purchase_file: UploadFile | None,
    consumption_file: UploadFile | None,
    direct_file: UploadFile | None,
    indirect_file: UploadFile | None,
    other_income_file: UploadFile | None,
    month: str,
    session_id: str | None,
):
    from app.services.aggregator import aggregate_consumption, aggregate_purchase, aggregate_sales
    from app.services.cost_engine import compute_cost_allocation
    from app.services.parser import parse_consumption, parse_purchase, parse_sales
    from app.services.profitability import compute_profitability
    
    session = None
    if session_id:
        session = store.get(session_id)
    if session is None:
        session = store.create()
    
    sales_df, sales_warnings = None, []
    purchase_df, purchase_warnings = None, []
    consumption_df, consumption_warnings = None, []
    direct_df, direct_warnings = None, []
    indirect_df, indirect_warnings = None, []
    other_income_df, other_income_warnings = None, []

    if sales_file and sales_file.filename:
        sales_bytes = await sales_file.read()
        sales_df, sales_warnings = parse_sales(sales_bytes)

    if purchase_file and purchase_file.filename:
        purchase_bytes = await purchase_file.read()
        purchase_df, purchase_warnings = parse_purchase(purchase_bytes)

    if consumption_file and consumption_file.filename:
        consumption_bytes = await consumption_file.read()
        consumption_df, consumption_warnings = parse_consumption(consumption_bytes)

    if direct_file and direct_file.filename:
        direct_bytes = await direct_file.read()
        direct_df, direct_warnings = parse_direct_expenses(direct_bytes)

    if indirect_file and indirect_file.filename:
        indirect_bytes = await indirect_file.read()
        indirect_df, indirect_warnings = parse_indirect_expenses(indirect_bytes)

    if other_income_file and other_income_file.filename:
        other_bytes = await other_income_file.read()
        other_income_df, other_income_warnings = parse_other_income(other_bytes)

    all_warnings = sales_warnings + purchase_warnings + consumption_warnings + direct_warnings + indirect_warnings + other_income_warnings

    if all(df is None or df.empty for df in [sales_df, purchase_df, consumption_df, direct_df, indirect_df, other_income_df]):
        raise HTTPException(
            status_code=400,
            detail="No valid files uploaded.",
        )

    detected_months: set[str] = set()
    for df in [sales_df, purchase_df, consumption_df, direct_df, indirect_df, other_income_df]:
        if df is not None and not df.empty and "Month" in df.columns:
            for m in df["Month"].dropna().unique():
                m_str = str(m)
                if m_str not in ("NaT", "NaN", "None", "nan", "null", "") and not m_str.startswith("Na"):
                    detected_months.add(m_str)

    if month != "auto" and len(month) == 7 and month[4] == "-":
        months_to_process = [month]
    elif detected_months:
        months_to_process = sorted(detected_months)
    else:
        raise HTTPException(
            status_code=400,
            detail="Could not detect any months from the data.",
        )

    processed_months: list[str] = []

    for m in months_to_process:
        direct_agg = aggregate_expenses(direct_df, m) if direct_df is not None else None
        indirect_agg = aggregate_expenses(indirect_df, m) if indirect_df is not None else None

        def get_month_df(df, month_str):
            if df is None or df.empty:
                return pd.DataFrame()
            if "Month" in df.columns:
                result = df[df["Month"] == month_str]
                return result if isinstance(result, pd.DataFrame) else pd.DataFrame()
            return df if isinstance(df, pd.DataFrame) else pd.DataFrame()

        month_sales_df = get_month_df(sales_df, m)
        month_purchase_df = get_month_df(purchase_df, m)
        month_consumption_df = get_month_df(consumption_df, m)
        month_direct_df = get_month_df(direct_df, m)
        month_indirect_df = get_month_df(indirect_df, m)
        month_other_df = get_month_df(other_income_df, m)

        purchase_agg = aggregate_purchase(month_purchase_df, m) if not month_purchase_df.empty else pd.DataFrame()
        sales_agg = aggregate_sales(month_sales_df, m) if not month_sales_df.empty else pd.DataFrame()
        consumption_agg = aggregate_consumption(month_consumption_df, m) if not month_consumption_df.empty else pd.DataFrame()

        cost_allocation = compute_cost_allocation(purchase_agg, consumption_agg) if not purchase_agg.empty or not consumption_agg.empty else pd.DataFrame()
        profitability = compute_profitability(sales_agg, cost_allocation) if not sales_agg.empty else pd.DataFrame()

        if m in session.months:
            month_data = session.months[m]
            
            if not month_sales_df.empty:
                month_data.sales_raw = month_sales_df
                month_data.sales_agg = sales_agg
                month_data.profitability = profitability
            if not month_purchase_df.empty:
                month_data.purchase_raw = month_purchase_df
                month_data.purchase_agg = purchase_agg
            if not month_consumption_df.empty:
                month_data.consumption_raw = month_consumption_df
                month_data.consumption_agg = consumption_agg
            if not month_direct_df.empty:
                month_data.direct_expenses_raw = month_direct_df
                month_data.direct_expenses_agg = direct_agg if direct_agg is not None else pd.DataFrame()
            if not month_indirect_df.empty:
                month_data.indirect_expenses_raw = month_indirect_df
                month_data.indirect_expenses_agg = indirect_agg if indirect_agg is not None else pd.DataFrame()
            if not month_other_df.empty:
                month_data.other_income_raw = month_other_df
            if not cost_allocation.empty:
                month_data.cost_allocation = cost_allocation
            if all_warnings:
                month_data.warnings.extend(all_warnings)
        else:
            from app.models.session import MonthData
            month_data = MonthData(
                month=m,
                sales_raw=month_sales_df,
                purchase_raw=month_purchase_df,
                consumption_raw=month_consumption_df,
                direct_expenses_raw=month_direct_df,
                indirect_expenses_raw=month_indirect_df,
                other_income_raw=month_other_df,
                sales_agg=sales_agg,
                purchase_agg=purchase_agg,
                consumption_agg=consumption_agg,
                cost_allocation=cost_allocation,
                profitability=profitability,
                direct_expenses_agg=direct_agg if direct_agg is not None else pd.DataFrame(),
                indirect_expenses_agg=indirect_agg if indirect_agg is not None else pd.DataFrame(),
                warnings=all_warnings,
            )
            session.months[m] = month_data

        processed_months.append(m)

    return {
        "session_id": session.session_id,
        "month": processed_months[0] if processed_months else None,
        "months": processed_months,
        "sales_rows": len(sales_df) if sales_df is not None else 0,
        "purchase_rows": len(purchase_df) if purchase_df is not None else 0,
        "consumption_rows": len(consumption_df) if consumption_df is not None else 0,
        "direct_expense_rows": len(direct_df) if direct_df is not None else 0,
        "indirect_expense_rows": len(indirect_df) if indirect_df is not None else 0,
        "other_income_rows": len(other_income_df) if other_income_df is not None else 0,
        "validation_warnings": all_warnings,
    }


@router.get("/expenses/debug")
async def debug_session(session_id: str | None = None):
    """Debug endpoint to check session status."""
    if not session_id:
        return {"error": "No session_id provided", "session_id": session_id}
    
    session = store.get(session_id)
    if not session:
        return {"error": "Session not found", "session_id": session_id}
    
    debug_info = {
        "session_id": session.session_id,
        "months": list(session.months.keys()),
    }
    
    # Check columns in expense data
    for m in session.months:
        direct_df = getattr(session.months[m], 'direct_expenses_raw', None)
        indirect_df = getattr(session.months[m], 'indirect_expenses_raw', None)
        
        if direct_df is not None and hasattr(direct_df, 'columns'):
            debug_info[f"direct_cols_{m}"] = list(direct_df.columns) if hasattr(direct_df, 'empty') and not direct_df.empty else []
            if direct_df is not None and hasattr(direct_df, 'empty') and not direct_df.empty and "Debit" in direct_df.columns:
                debug_info[f"direct_debit_sum_{m}"] = float(direct_df["Debit"].sum())
        
        if indirect_df is not None and hasattr(indirect_df, 'columns'):
            debug_info[f"indirect_cols_{m}"] = list(indirect_df.columns) if hasattr(indirect_df, 'empty') and not indirect_df.empty else []
            if indirect_df is not None and hasattr(indirect_df, 'empty') and not indirect_df.empty and "Debit" in indirect_df.columns:
                debug_info[f"indirect_debit_sum_{m}"] = float(indirect_df["Debit"].sum())
    
    return debug_info


@router.get("/expenses/income-statement")
async def get_income_statement(
    session_id: str | None = None,
    month: str | None = None,
):
    """Get income statement data from expense files."""
    if not session_id:
        return {"months": [], "statement": [], "error": "session_id required"}
    
    session = store.get(session_id)
    if not session:
        return {"months": [], "statement": [], "error": "Session not found"}
    
    if not session.months:
        return {"months": [], "statement": [], "error": "No data available"}
    
    def is_valid_month(m):
        if not m:
            return False
        m_str = str(m)
        return m_str not in ("NaT", "NaN", "None", "nan", "null", "") and not m_str.startswith("Na")
    
    valid_months = [m for m in session.months.keys() if is_valid_month(m)]
    
    if month:
        months_to_show = [month] if month in session.months and is_valid_month(month) else []
    else:
        months_to_show = sorted(valid_months)
    
    if not months_to_show:
        return {"months": [], "statement": [], "error": "No months to show"}
    
    TAX_RATE = 0.25168
    DEPRECIATION_KEYWORDS = ["depreciation", "depn", "dep", "amortization"]
    INTEREST_KEYWORDS = ["interest", "finance cost", "bank charges", "loan"]
    
    def matches_keyword(text, keywords):
        if not text:
            return False
        text_lower = str(text).lower()
        return any(kw.lower() in text_lower for kw in keywords)
    
    rows = []
    for m in months_to_show:
        if m in ("NaT", "NaN", "None", "nan", "null", "") or str(m).startswith("Na"):
            continue
        month_data = session.months[m]
        
        # Get Direct Expenses
        direct_df = getattr(month_data, 'direct_expenses_raw', None)
        direct_total = 0.0
        if direct_df is not None and hasattr(direct_df, 'empty') and not direct_df.empty:
            if "Debit" in direct_df.columns:
                direct_total = float(direct_df["Debit"].sum())
        
        # Get Indirect Expenses
        indirect_df = getattr(month_data, 'indirect_expenses_raw', None)
        indirect_total = 0.0
        depreciation = 0.0
        interest = 0.0
        
        if indirect_df is not None and hasattr(indirect_df, 'empty') and not indirect_df.empty:
            if "Debit" in indirect_df.columns:
                indirect_total = float(indirect_df["Debit"].sum())
            
            # Extract depreciation and interest
            if "Expense Head" in indirect_df.columns:
                for _, row in indirect_df.iterrows():
                    expense_head = str(row.get("Expense Head", ""))
                    debit = float(row.get("Debit", 0) or 0)
                    if matches_keyword(expense_head, DEPRECIATION_KEYWORDS):
                        depreciation += debit
                    if matches_keyword(expense_head, INTEREST_KEYWORDS):
                        interest += debit
        
        # Get Sales (if available)
        sales_df = getattr(month_data, 'sales_raw', None)
        revenue = 0.0
        if sales_df is not None and hasattr(sales_df, 'empty') and not sales_df.empty:
            if "Amount" in sales_df.columns:
                revenue = float(sales_df["Amount"].sum())
        
        # Get Other Income (if available)
        other_income_df = getattr(month_data, 'other_income_raw', None)
        other_income = 0.0
        if other_income_df is not None and hasattr(other_income_df, 'empty') and not other_income_df.empty:
            if "Discount Received" in other_income_df.columns:
                other_income = float(other_income_df["Discount Received"].sum())
        
        # Get Purchases (if available)
        purchase_df = getattr(month_data, 'purchase_raw', None)
        purchases = 0.0
        if purchase_df is not None and hasattr(purchase_df, 'empty') and not purchase_df.empty:
            if "Amount" in purchase_df.columns:
                purchases = float(purchase_df["Amount"].sum())
        
        # Calculate
        total_direct = purchases + direct_total
        total_expenses = total_direct + indirect_total  # This is Total Expenses
        total_income = revenue + other_income
        ebitda = total_income - total_expenses
        ebit = ebitda - depreciation
        pbt = ebit - interest
        tax = pbt * TAX_RATE if pbt > 0 else 0
        pat = pbt - tax
        
        rows.append({
            "month": m,
            "revenue": revenue,
            "other_income": other_income,
            "total_income": total_income,
            "purchases": purchases,
            "direct_expenses": direct_total,
            "total_direct_expenses": total_direct,
            "indirect_expenses": indirect_total,
            "total_expenses": total_expenses,
            "ebitda": ebitda,
            "depreciation": depreciation,
            "ebit": ebit,
            "interest": interest,
            "pbt": pbt,
            "tax": tax,
            "pat": pat,
        })
    
    return {"months": months_to_show, "statement": rows}


@router.get("/expenses/details")
async def get_expense_details(
    session_id: str | None = None,
    month: str | None = None,
    section: str | None = None,
    months: str | None = None,
):
    """Get detailed data for a specific section (direct_expenses, indirect_expenses, other_income, revenue, purchases).
    Use 'months' param (comma-separated) for multi-month comparison.
    """
    if not session_id:
        return {"error": "session_id required"}
    
    session = store.get(session_id)
    if not session:
        return {"error": "Session not found"}
    
    def is_valid_month(m):
        if not m:
            return False
        m_str = str(m)
        return m_str not in ("NaT", "NaN", "None", "nan", "null", "") and not m_str.startswith("Na")
    
    month_list = []
    if months:
        month_list = [m.strip() for m in months.split(",") if m.strip() in session.months and is_valid_month(m.strip())]
    elif month and month in session.months and is_valid_month(month):
        month_list = [month]
    
    if not month_list:
        return {"error": "No valid months found"}
    
    SECTION_CONFIG = {
        "revenue": {"group_col": "Item Type", "amount_col": "Amount", "qty_col": "Qty", "label": "Item Type", "amount": "Amount", "qty": "Qty"},
        "purchases": {"group_col": "ItemName", "amount_col": "Amount", "qty_col": "Qty", "label": "Item Name", "amount": "Amount", "qty": "Qty"},
        "other_income": {"group_col": "Consignee/Party", "amount_col": "Discount Received", "label": "Party", "amount": "Discount Received"},
        "direct_expenses": {"group_col": "Expense Head", "amount_col": "Debit", "label": "Expense Head", "amount": "Debit", "show_percentage": True},
        "indirect_expenses": {"group_col": "Expense Head", "amount_col": "Debit", "label": "Expense Head", "amount": "Debit", "show_percentage": True},
    }
    
    total_sales = 0.0
    for m in month_list:
        month_data_temp = session.months[m]
        sales_df = getattr(month_data_temp, 'sales_raw', None)
        if sales_df is not None and not sales_df.empty and "Amount" in sales_df.columns:
            total_sales += float(sales_df["Amount"].sum())
    
    def df_to_aggregated(df: pd.DataFrame | None, group_col: str, amount_col: str, qty_col: str | None = None, show_percentage: bool = False, use_total_sales: float = 0) -> list[dict]:
        if df is None or df.empty or group_col not in df.columns or amount_col not in df.columns:
            return []
        
        agg_dict = {amount_col: "sum"}
        if qty_col and qty_col in df.columns:
            agg_dict[qty_col] = "sum"
        
        agg_df = df.groupby(group_col, dropna=False).agg(agg_dict).reset_index()
        agg_df = agg_df.sort_values(amount_col, ascending=False)
        
        records = []
        for _, row in agg_df.iterrows():
            item_name = str(row[group_col]) if pd.notna(row[group_col]) else "Unknown"
            amount = float(row[amount_col])
            record = {config.get("label", group_col): item_name, config.get("amount", amount_col): amount}
            
            if qty_col and qty_col in df.columns:
                qty = float(row[qty_col]) if pd.notna(row.get(qty_col)) else 0
                record[config.get("qty", qty_col)] = qty
            
            if show_percentage and use_total_sales > 0:
                pct = (amount / use_total_sales) * 100
                record["% of Sales"] = round(pct, 2)
            
            records.append(record)
        return records
    
    def df_total(df: pd.DataFrame | None, col: str) -> float:
        if df is None or df.empty or col not in df.columns:
            return 0.0
        return float(df[col].sum())
    
    config = SECTION_CONFIG.get(section, {})
    
    if section not in SECTION_CONFIG:
        return {"error": f"Unknown section: {section}"}
    
    df_map = {
        "revenue": 'sales_raw',
        "purchases": 'purchase_raw',
        "other_income": 'other_income_raw',
        "direct_expenses": 'direct_expenses_raw',
        "indirect_expenses": 'indirect_expenses_raw',
    }
    
    group_col = config.get("group_col")
    amount_col = config.get("amount_col")
    qty_col = config.get("qty_col")
    show_pct = config.get("show_percentage", False)
    
    if len(month_list) == 1:
        month_data_single = session.months[month_list[0]]
        df = getattr(month_data_single, df_map.get(section, ''), None)
        
        month_sales = 0.0
        sales_raw = getattr(month_data_single, 'sales_raw', None)
        if sales_raw is not None and not sales_raw.empty and "Amount" in sales_raw.columns:
            month_sales = float(sales_raw["Amount"].sum())
        
        result = {
            "month": month_list[0],
            "months": month_list,
            "total_sales": month_sales,
            "data": df_to_aggregated(df, group_col, amount_col, qty_col, show_pct, month_sales),
            "columns": _build_columns(config, group_col, amount_col, qty_col, show_pct),
            "total": df_total(df, amount_col),
        }
    else:
        all_data = {}
        for m in month_list:
            month_data = session.months[m]
            df = getattr(month_data, df_map.get(section, ''), None)
            if df is not None and not df.empty:
                agg_df = df.groupby(group_col, dropna=False)[amount_col].sum().reset_index()
                for _, row in agg_df.iterrows():
                    item_name = str(row[group_col]) if pd.notna(row[group_col]) else "Unknown"
                    amount = float(row[amount_col])
                    if item_name not in all_data:
                        all_data[item_name] = {"item": item_name, "total": 0}
                    all_data[item_name]["total"] += amount
                    all_data[item_name][m] = amount
        
        records = [{"Item": item, **vals} for item, vals in sorted(all_data.items(), key=lambda x: x[1]["total"], reverse=True)]
        
        cols = ["Item"] + month_list
        result = {
            "month": month_list[0],
            "months": month_list,
            "total_sales": total_sales,
            "data": records,
            "columns": cols,
            "total": sum(all_data.get(m, {}).get("total", 0) for m in all_data) if all_data else 0,
        }
    
    return result

def _build_columns(config: dict, group_col: str, amount_col: str, qty_col: str | None, show_pct: bool) -> list[str]:
    cols = [config.get("label", group_col)]
    if qty_col:
        cols.append(config.get("qty", "Qty"))
    cols.append(config.get("amount", amount_col))
    if show_pct:
        cols.append("% of Sales")
    return cols
