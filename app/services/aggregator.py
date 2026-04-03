"""Monthly aggregation logic for purchase, sales, and consumption data."""

from __future__ import annotations

import pandas as pd

from app.config import MATERIAL_COLUMNS


def aggregate_purchase(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """Aggregate purchase data by ItemName + Month.

    Returns DataFrame with columns:
        ItemName, Month, TotalQty, TotalAmount, TotalLAmount, AvgRate, AvgLRate
    """
    if df.empty:
        return pd.DataFrame(columns=[
            "ItemName", "Month", "TotalQty", "TotalAmount", "TotalLAmount",
            "AvgRate", "AvgLRate",
        ])

    month_df = df[df["Month"] == month].copy() if "Month" in df.columns else df.copy()
    if month_df.empty:
        return pd.DataFrame(columns=[
            "ItemName", "Month", "TotalQty", "TotalAmount", "TotalLAmount",
            "AvgRate", "AvgLRate",
        ])

    agg = month_df.groupby("ItemName", as_index=False).agg(
        TotalQty=("Qty", "sum"),
        TotalAmount=("Amount", "sum"),
        TotalLAmount=("LAmount", "sum"),
    )
    agg["Month"] = month

    # Weighted average rates
    agg["AvgRate"] = agg.apply(
        lambda r: r["TotalAmount"] / r["TotalQty"] if r["TotalQty"] != 0 else 0.0,
        axis=1,
    )
    agg["AvgLRate"] = agg.apply(
        lambda r: r["TotalLAmount"] / r["TotalQty"] if r["TotalQty"] != 0 else 0.0,
        axis=1,
    )

    return agg


def aggregate_sales(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """Aggregate sales data by Grade + PartyName + Month.

    Combines all Pump types (sale, pumping, credit note, manual).

    Returns DataFrame with columns:
        Grade, PartyName, Month, TotalQty, TotalAmount, TotalTaxAmount
    """
    if df.empty:
        return pd.DataFrame(columns=[
            "Grade", "PartyName", "Month", "TotalQty", "TotalAmount", "TotalTaxAmount",
        ])

    month_df = df[df["Month"] == month].copy() if "Month" in df.columns else df.copy()
    if month_df.empty:
        return pd.DataFrame(columns=[
            "Grade", "PartyName", "Month", "TotalQty", "TotalAmount", "TotalTaxAmount",
        ])

    agg = month_df.groupby(["Grade", "PartyName"], as_index=False).agg(
        TotalQty=("Qty", "sum"),
        TotalAmount=("Amount", "sum"),
        TotalTaxAmount=("Total Amount", "sum"),
    )
    agg["Month"] = month

    return agg


def aggregate_consumption(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """Aggregate consumption data by Grade + PartyName + Month.

    Returns DataFrame with columns:
        Grade, PartyName, Month, TotalQty, Batches, and sum of each material column.
    """
    if df.empty:
        cols = ["Grade", "PartyName", "Month", "TotalQty", "Batches"] + [
            c for c in MATERIAL_COLUMNS if c != "Month"
        ]
        return pd.DataFrame(columns=cols)

    month_df = df[df["Month"] == month].copy() if "Month" in df.columns else df.copy()
    if month_df.empty:
        cols = ["Grade", "PartyName", "Month", "TotalQty", "Batches"] + [
            c for c in MATERIAL_COLUMNS
        ]
        return pd.DataFrame(columns=cols)

    # Build aggregation dict
    agg_dict: dict[str, tuple[str, str]] = {
        "TotalQty": ("Qty", "sum"),
        "Batches": ("Qty", "count"),
    }
    for col in MATERIAL_COLUMNS:
        if col in month_df.columns:
            agg_dict[col] = (col, "sum")

    agg = month_df.groupby(["Grade", "PartyName"], as_index=False).agg(**agg_dict)
    agg["Month"] = month

    return agg


def aggregate_expenses(df: pd.DataFrame, month: str) -> pd.DataFrame:
    """Aggregate expense data by Expense Head + Month.

    Returns DataFrame with columns:
        ExpenseHead, Month, TotalDebit, TotalCredit, NetAmount, TransactionCount
    """
    if df.empty:
        return pd.DataFrame(columns=[
            "ExpenseHead", "Month", "TotalDebit", "TotalCredit", "NetAmount", "TransactionCount",
        ])

    month_df = df[df["Month"] == month].copy() if "Month" in df.columns else df.copy()
    if month_df.empty:
        return pd.DataFrame(columns=[
            "ExpenseHead", "Month", "TotalDebit", "TotalCredit", "NetAmount", "TransactionCount",
        ])

    agg = month_df.groupby("Expense Head", as_index=False).agg(
        TotalDebit=("Debit", "sum"),
        TotalCredit=("Credit", "sum"),
        TransactionCount=("Debit", "count"),
    )
    agg["NetAmount"] = agg["TotalDebit"] - agg["TotalCredit"]
    agg["ExpenseHead"] = agg["Expense Head"]
    agg["Month"] = month

    return agg[["ExpenseHead", "Month", "TotalDebit", "TotalCredit", "NetAmount", "TransactionCount"]]


def get_monthly_totals(df: pd.DataFrame, amount_col: str = "TotalAmount") -> pd.Series:
    """Get total amount by month from a DataFrame."""
    if df.empty or "Month" not in df.columns:
        return pd.Series(dtype=float)
    if amount_col not in df.columns:
        amount_col = df.select_dtypes(include=["number"]).columns[0] if len(df.select_dtypes(include=["number"]).columns) > 0 else None
        if not amount_col:
            return pd.Series(dtype=float)
    return df.groupby("Month")[amount_col].sum()


def generate_income_statement(session_data: dict) -> list[dict]:
    """Generate income statement data for all months.
    
    Args:
        session_data: Dict with keys for each data source, each containing
                     {"dataframe": pd.DataFrame, "summary": dict}
    
    Returns:
        List of dicts with month-wise income statement rows
    """
    from app.config import INCOME_STATEMENT_SECTIONS
    
    all_months = set()
    
    # Collect all months from all sources
    sources = {
        "sales": session_data.get("sales_raw"),
        "purchase": session_data.get("purchase_raw"),
        "consumption": session_data.get("consumption_raw"),
        "direct_expenses": session_data.get("direct_expenses_raw"),
        "indirect_expenses": session_data.get("indirect_expenses_raw"),
    }
    
    for source_name, df in sources.items():
        if df is not None and hasattr(df, "columns") and not df.empty and "Month" in df.columns:
            all_months.update(df["Month"].unique())
    
    all_months = sorted(all_months)
    if not all_months:
        return []
    
    # Calculate monthly totals for each source
    monthly_totals = {}
    
    # Sales = Total Amount
    sales_df = sources.get("sales")
    if sales_df is not None and hasattr(sales_df, "columns") and not sales_df.empty:
        sales_by_month = sales_df.groupby("Month")["Total Amount"].sum()
        monthly_totals["revenue"] = sales_by_month.to_dict()
    else:
        monthly_totals["revenue"] = {m: 0 for m in all_months}
    
    # Purchases = Amount column
    purchase_df = sources.get("purchase")
    if purchase_df is not None and hasattr(purchase_df, "columns") and not purchase_df.empty:
        purchase_by_month = purchase_df.groupby("Month")["Amount"].sum()
        monthly_totals["purchases"] = purchase_by_month.to_dict()
    else:
        monthly_totals["purchases"] = {m: 0 for m in all_months}
    
    # COGS = Qty from consumption (or total of materials)
    consumption_df = sources.get("consumption")
    if consumption_df is not None and hasattr(consumption_df, "columns") and not consumption_df.empty:
        cogs_by_month = consumption_df.groupby("Month")["Qty"].sum()
        monthly_totals["cogs"] = cogs_by_month.to_dict()
    else:
        monthly_totals["cogs"] = {m: 0 for m in all_months}
    
    # Direct Expenses = Debit
    direct_df = sources.get("direct_expenses")
    if direct_df is not None and hasattr(direct_df, "columns") and not direct_df.empty:
        direct_by_month = direct_df.groupby("Month")["Debit"].sum()
        monthly_totals["direct_expenses"] = direct_by_month.to_dict()
    else:
        monthly_totals["direct_expenses"] = {m: 0 for m in all_months}
    
    # Indirect Expenses = Debit
    indirect_df = sources.get("indirect_expenses")
    if indirect_df is not None and hasattr(indirect_df, "columns") and not indirect_df.empty:
        indirect_by_month = indirect_df.groupby("Month")["Debit"].sum()
        monthly_totals["indirect_expenses"] = indirect_by_month.to_dict()
    else:
        monthly_totals["indirect_expenses"] = {m: 0 for m in all_months}
    
    # Build income statement rows
    rows = []
    for month in all_months:
        row = {"month": month}
        
        # Calculate derived values
        revenue = monthly_totals["revenue"].get(month, 0)
        opening_inventory = 0  # Manual
        other_income = 0  # Manual
        total_income = revenue + opening_inventory + other_income
        
        purchases = monthly_totals["purchases"].get(month, 0)
        cogs = monthly_totals["cogs"].get(month, 0)
        direct_expenses = monthly_totals["direct_expenses"].get(month, 0)
        total_direct_expenses = purchases + cogs + direct_expenses
        
        indirect_expenses = monthly_totals["indirect_expenses"].get(month, 0)
        total_expenses = total_direct_expenses + indirect_expenses
        
        ebitda = total_income - total_expenses
        depreciation = 0  # Manual
        ebit = ebitda - depreciation
        interest = 0  # Manual
        pbt = ebit - interest
        tax = 0  # Manual
        pat = pbt - tax
        
        row["revenue"] = revenue
        row["opening_inventory"] = opening_inventory
        row["other_income"] = other_income
        row["total_income"] = total_income
        row["purchases"] = purchases
        row["cogs"] = cogs
        row["direct_expenses"] = direct_expenses
        row["total_direct_expenses"] = total_direct_expenses
        row["indirect_expenses"] = indirect_expenses
        row["total_expenses"] = total_expenses
        row["ebitda"] = ebitda
        row["depreciation"] = depreciation
        row["ebit"] = ebit
        row["interest"] = interest
        row["pbt"] = pbt
        row["tax"] = tax
        row["pat"] = pat
        
        rows.append(row)
    
    return rows
