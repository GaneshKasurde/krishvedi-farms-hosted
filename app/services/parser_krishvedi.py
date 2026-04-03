"""Excel parsing for Krishvedi Farms single-sheet format."""

from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd

from app.config_krishvedi import (
    KRISHVEDI_COLUMNS,
    VCH_TYPE_MAPPING,
    CATEGORY_COLUMN,
)


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from column names."""
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _coerce_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Convert specified columns to numeric, filling NaN with 0."""
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df


def _parse_dates(df: pd.DataFrame, col: str = "Date") -> pd.DataFrame:
    """Parse date column to datetime."""
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], format="%d-%b-%Y", errors="coerce")
        if df[col].isna().all():
            df[col] = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
    return df


def _strip_string_columns(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Strip whitespace from string columns."""
    for col in cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
    return df


def _validate_columns(df: pd.DataFrame, expected: list[str]) -> list[str]:
    """Check that expected columns are present."""
    warnings = []
    actual = set(df.columns)
    for col in expected:
        if col not in actual:
            warnings.append(f"Missing expected column: '{col}'")
    return warnings


def parse_krishvedi(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Krishvedi Farms Excel file (single sheet)."""
    warnings = []
    df = None
    
    try:
        # Check sheets
        xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
        print("DEBUG: Sheets in file:", xl.sheet_names)
        
        # Try each sheet
        for sheet in xl.sheet_names:
            print(f"DEBUG: Trying sheet: {sheet}")
            df_temp = pd.read_excel(BytesIO(file_bytes), engine="openpyxl", sheet_name=sheet)
            df_temp = _normalize_columns(df_temp)
            print(f"DEBUG: {sheet} columns: {list(df_temp.columns)}")
            
            if "Date" in df_temp.columns:
                df = df_temp
                print(f"DEBUG: Found Date column in sheet: {sheet}")
                break
            # Also check for 'Date ' with trailing space
            cols_with_date = [c for c in df_temp.columns if 'Date' in str(c)]
            if cols_with_date:
                print(f"DEBUG: Found columns with Date: {cols_with_date}")
                df = df_temp
                break
        
        # If no Date column found, use first sheet anyway
        if df is None:
            print("DEBUG: No Date column found, using first sheet anyway")
            df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl", sheet_name=xl.sheet_names[0])
            df = _normalize_columns(df)
            
    except Exception as e:
        print(f"DEBUG: Error reading Excel: {e}")
        return pd.DataFrame(), [f"Failed to read Excel file: {e}"]

    print("DEBUG: Final columns:", list(df.columns))
    print("DEBUG: First 3 rows:\n", df.head(3).to_string())
    
    # Validate columns
    warnings.extend(_validate_columns(df, KRISHVEDI_COLUMNS))

    # Parse date and extract month
    df = _parse_dates(df, "Date")
    
    if "Date" in df.columns:
        print("DEBUG: Date sample:", df["Date"].head(5).tolist())
        print("DEBUG: Date dtype:", str(df["Date"].dtype))
        print("DEBUG: Date isna:", df["Date"].isna().sum())
    
    if "Date" in df.columns and not df["Date"].isna().all():
        df["Month"] = df["Date"].dt.to_period("M").astype(str)
        print("DEBUG: Month sample:", df["Month"].head(5).tolist())
    else:
        # Try to find date column with different name
        print("DEBUG: Looking for alternative date columns...")
        for col in df.columns:
            if 'date' in col.lower():
                print(f"DEBUG: Trying column: {col}")
                df['Date'] = pd.to_datetime(df[col], format="%d-%b-%Y", errors="coerce")
                if not df['Date'].isna().all():
                    df["Month"] = df["Date"].dt.to_period("M").astype(str)
                    print("DEBUG: Found date in column:", col)
                    break

    # Strip string columns
    df = _strip_string_columns(df, ["Party", "Items", "Vch Type", "Vch No."])

    # Convert numeric columns
    numeric_cols = [
        "Inwards_QTY", "Value", "Outwards_QTY", "Value_1",
        "Gross Value", "Consumption", "Gross Profit", "Perc %",
        "Closing_QTY", "Balance"
    ]
    df = _coerce_numeric(df, numeric_cols)

    # Map Vch Type to category
    if "Vch Type" in df.columns:
        print(f"DEBUG: Vch Type unique values: {df['Vch Type'].unique().tolist()}")
        df["Category"] = df["Vch Type"].map(VCH_TYPE_MAPPING).fillna("other")
        print(f"DEBUG: Category unique values: {df['Category'].unique().tolist()}")

    # Don't filter any rows - keep everything including "Totals as per..." rows
    # The analysis will handle what to include

    return df, warnings


def aggregate_krishvedi(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Aggregate data by month and category."""
    if df.empty or "Month" not in df.columns:
        return {
            "sales": pd.DataFrame(),
            "purchases": pd.DataFrame(),
            "consumption": pd.DataFrame(),
        }

    result = {}

    # Sales (Sales + Credit Note)
    sale_df = df[df["Category"] == "sale"].copy()
    if not sale_df.empty:
        sale_agg = sale_df.groupby(["Month", "Items", "Party"]).agg({
            "Value_1": "sum",
            "Outwards_QTY": "sum",
            "Gross Value": "sum",
            "Gross Profit": "sum",
        }).reset_index()
        sale_agg.columns = ["Month", "Items", "Party", "Revenue", "Qty", "Gross_Value", "Profit"]
        result["sales"] = sale_agg
    else:
        result["sales"] = pd.DataFrame()

    # Purchases (Purchase + Debit Note)
    purchase_df = df[df["Category"] == "purchase"].copy()
    if not purchase_df.empty:
        purchase_agg = purchase_df.groupby(["Month", "Items", "Party"]).agg({
            "Value": "sum",
            "Inwards_QTY": "sum",
            "Gross Value": "sum",
        }).reset_index()
        purchase_agg.columns = ["Month", "Items", "Party", "Cost", "Qty", "Gross_Value"]
        result["purchases"] = purchase_agg
    else:
        result["purchases"] = pd.DataFrame()

    # Consumption (Stock Journal)
    consumption_df = df[df["Category"] == "consumption"].copy()
    if not consumption_df.empty:
        consumption_agg = consumption_df.groupby(["Month", "Items"]).agg({
            "Consumption": "sum",
            "Inwards_QTY": "sum",
        }).reset_index()
        consumption_agg.columns = ["Month", "Items", "Consumption", "Qty"]
        result["consumption"] = consumption_agg
    else:
        result["consumption"] = pd.DataFrame()

    return result


def get_monthly_summary(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Get monthly summary totals."""
    if df.empty or "Month" not in df.columns:
        return []

    summary = []

    for month in sorted(df["Month"].unique()):
        month_df = df[df["Month"] == month]

        sales_total = month_df[month_df["Category"] == "sale"]["Value_1"].sum() if "Value_1" in month_df.columns else 0
        purchase_total = month_df[month_df["Category"] == "purchase"]["Value"].sum() if "Value" in month_df.columns else 0
        consumption_total = month_df[month_df["Category"] == "consumption"]["Consumption"].sum() if "Consumption" in month_df.columns else 0

        balance_rows = month_df[month_df["Category"] == "closing_balance"]
        closing_balance = balance_rows["Balance"].sum() if not balance_rows.empty and "Balance" in balance_rows.columns else 0

        summary.append({
            "month": month,
            "sales": sales_total,
            "purchases": purchase_total,
            "consumption": consumption_total,
            "closing_balance": closing_balance,
            "gross_profit": sales_total - purchase_total,
        })

    return summary
