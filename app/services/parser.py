"""Excel parsing and validation for the three upload sheets."""

from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd

from app.config import (
    CONSUMPTION_COLUMNS,
    MATERIAL_COLUMNS,
    PURCHASE_COLUMNS,
    SALES_COLUMNS,
    DIRECT_EXPENSE_COLUMNS,
    INDIRECT_EXPENSE_COLUMNS,
    OTHER_INCOME_COLUMNS,
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
        df[col] = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
    return df


def _strip_string_columns(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Strip whitespace from string columns (important for ItemName)."""
    for col in cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
    return df


def _validate_columns(
    df: pd.DataFrame, expected: list[str], sheet_name: str
) -> list[str]:
    """Check that expected columns are present. Return warnings for missing."""
    warnings: list[str] = []
    actual = set(df.columns)
    for col in expected:
        if col not in actual:
            warnings.append(f"{sheet_name}: missing expected column '{col}'")
    return warnings


def parse_purchase(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Purchase_ACPL Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Purchase: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, PURCHASE_COLUMNS, "Purchase"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["ItemName", "PartyName", "TaxType", "Status", "Branch", "UOM"])
    df = _coerce_numeric(df, ["Qty", "Rate", "Amount", "L Rate", "LAmount"])

    # Add month column
    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings


def parse_sales(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Sales_ACPL Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Sales: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, SALES_COLUMNS, "Sales"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["PartyName", "SiteName", "Grade", "Pump", "Item Type"])
    df = _coerce_numeric(df, ["Qty", "Rate", "Include Tax Rate", "Amount", "Total Amount"])

    # The Grade column in real data is often truncated to 5 chars (e.g., "M-20 ").
    # Extract the proper grade from Item Type which has the full name (e.g., "RMC M-30 FF").
    if "Item Type" in df.columns:
        # Mark whether this is an RMC item
        df["IsRMC"] = df["Item Type"].str.upper().str.startswith("RMC", na=False)

        # Extract grade from Item Type: "RMC M-30 FF" -> "M-30 FF"
        df["Grade"] = df.apply(
            lambda r: r["Item Type"].replace("RMC", "").strip()
            if r.get("IsRMC") else r.get("Item Type", ""),
            axis=1,
        )

    # Filter out summary/junk rows (TOTAL, DATE, Date in original Grade)
    if "Date" in df.columns:
        # Drop rows where Date failed to parse (NaT) — these are likely junk rows
        df = df.dropna(subset=["Date"])

    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings


def parse_consumption(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Consumption_ACPL Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Consumption: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, CONSUMPTION_COLUMNS, "Consumption"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["PartyName", "JobSite", "Grade"])
    numeric_cols = ["Qty"] + [c for c in MATERIAL_COLUMNS if c in df.columns]
    df = _coerce_numeric(df, numeric_cols)

    # Normalize Grade: strip "RMC " prefix to match Sales grades (e.g., "RMC M-30" -> "M-30")
    if "Grade" in df.columns:
        df["Grade"] = df["Grade"].str.replace(r"^RMC\s+", "", regex=True).str.strip()

    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings


def parse_direct_expenses(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Direct Expenses Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Direct Expenses: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, DIRECT_EXPENSE_COLUMNS, "Direct Expenses"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["Particulars", "Vch Type", "Narrations", "Sub Group", "Expense Head", "Direct / Indirect Expense"])
    df = _coerce_numeric(df, ["Debit", "Credit"])

    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings


def parse_indirect_expenses(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Indirect Expenses Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Indirect Expenses: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, INDIRECT_EXPENSE_COLUMNS, "Indirect Expenses"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["Particulars", "Vch Type", "Type", "Sub Group", "Expense Head", "Direct / Indirect Expense", "Fixed"])
    df = _coerce_numeric(df, ["Debit", "Credit"])

    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings


def parse_other_income(file_bytes: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Parse Other Income Excel file."""
    warnings: list[str] = []
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
    except Exception as e:
        return pd.DataFrame(), [f"Other Income: failed to read Excel file: {e}"]

    df = _normalize_columns(df)
    warnings.extend(_validate_columns(df, OTHER_INCOME_COLUMNS, "Other Income"))

    df = _parse_dates(df, "Date")
    df = _strip_string_columns(df, ["Particulars", "Consignee/Party", "Voucher Type", "Narration"])
    df = _coerce_numeric(df, ["Gross Total", "Diesel & Petrol Expenses", "Discount Received"])

    if "Date" in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    return df, warnings
