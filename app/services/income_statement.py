"""Income statement generation with proper COGS calculation and expense extraction."""

import pandas as pd
from typing import Optional
from app.config import DEPRECIATION_KEYWORDS, INTEREST_KEYWORDS


def _matches_keyword(text: str, keywords: list[str]) -> bool:
    """Check if text contains any of the keywords."""
    if not text:
        return False
    text_lower = str(text).lower()
    return any(kw.lower() in text_lower for kw in keywords)


def extract_expense_by_type(df: pd.DataFrame, month: str, keywords: list[str]) -> float:
    """Extract expense amount from Indirect Expenses sheet based on Expense Head or Sub Group."""
    if df is None or df.empty:
        return 0.0
    
    if "Month" not in df.columns:
        return 0.0
    
    month_df = df[df["Month"] == month]
    if month_df.empty:
        return 0.0
    
    total = 0.0
    
    # Check Expense Head column (J column in Excel)
    if "Expense Head" in month_df.columns:
        matching_rows = month_df[
            month_df["Expense Head"].apply(lambda x: _matches_keyword(x, keywords))
        ]
        if "Debit" in matching_rows.columns:
            total += matching_rows["Debit"].sum()
    
    # Also check Sub Group column (H column in Excel)
    if "Sub Group" in month_df.columns:
        matching_rows = month_df[
            month_df["Sub Group"].apply(lambda x: _matches_keyword(x, keywords))
        ]
        if "Debit" in matching_rows.columns:
            total += matching_rows["Debit"].sum()
    
    return total


def calculate_cogs(
    consumption_df: pd.DataFrame,
    purchase_df: pd.DataFrame,
    month: str,
    material_columns: list[str]
) -> float:
    """
    COGS = Opening Stock + Purchases – Closing Stock
    """
    # Get purchases for the month
    purchases = 0.0
    if purchase_df is not None and not purchase_df.empty and "Month" in purchase_df.columns:
        month_purchases = purchase_df[purchase_df["Month"] == month]
        if "Amount" in month_purchases.columns:
            purchases = month_purchases["Amount"].sum()
    
    # Get total materials consumed this month (proxy for closing stock used)
    closing_stock = 0.0
    if consumption_df is not None and not consumption_df.empty and "Month" in consumption_df.columns:
        month_consumption = consumption_df[consumption_df["Month"] == month]
        for col in material_columns:
            if col in month_consumption.columns:
                closing_stock += month_consumption[col].sum()
    
    # Get opening stock (previous month's closing stock)
    all_months = []
    if consumption_df is not None and not consumption_df.empty and "Month" in consumption_df.columns:
        all_months = sorted(consumption_df["Month"].unique().tolist())
    
    opening_stock = 0.0
    if month in all_months:
        month_idx = all_months.index(month)
        if month_idx > 0:
            prev_month = all_months[month_idx - 1]
            prev_consumption = consumption_df[consumption_df["Month"] == prev_month]
            for col in material_columns:
                if col in prev_consumption.columns:
                    opening_stock += prev_consumption[col].sum()
    
    # COGS = Opening Stock + Purchases - Closing Stock
    cogs = opening_stock + purchases - closing_stock
    return cogs


def calculate_tax(pbt: float, tax_rate: float = 0.02168) -> float:
    """Calculate tax as PBT × Tax Rate (default 2.168%)"""
    if pbt <= 0:
        return 0.0
    return pbt * tax_rate


def generate_income_statement(
    session_data: dict,
    material_columns: list[str],
    tax_rate: float = 0.02168
) -> list[dict]:
    """
    Generate income statement data for all months.
    
    Args:
        session_data: Dict with keys for each data source (DataFrames)
        material_columns: List of material column names for COGS calculation
        tax_rate: Tax rate for PBT (default 2.168%)
    """
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
    
    # Get Indirect Expenses DataFrame for extracting depreciation and interest
    indirect_df = sources.get("indirect_expenses")
    
    # Build income statement rows
    rows = []
    for month in all_months:
        row = {"month": month}
        
        # INCOME SECTION
        # 1. Sales = Total Amount (from Sales sheet)
        sales_df = sources.get("sales")
        revenue = 0.0
        if sales_df is not None and hasattr(sales_df, "columns") and not sales_df.empty:
            if "Month" in sales_df.columns and "Total Amount" in sales_df.columns:
                month_sales = sales_df[sales_df["Month"] == month]
                revenue = month_sales["Total Amount"].sum()
        row["revenue"] = revenue
        
        # 2. Opening Inventory (manual for now)
        opening_inventory = 0.0
        row["opening_inventory"] = opening_inventory
        
        # 3. Other Income (manual for now)
        other_income = 0.0
        row["other_income"] = other_income
        
        # 4. Total Income
        total_income = revenue + opening_inventory + other_income
        row["total_income"] = total_income
        
        # EXPENSES SECTION
        # 5. Purchases = Amount column (from Purchase sheet)
        purchase_df = sources.get("purchase")
        purchases = 0.0
        if purchase_df is not None and hasattr(purchase_df, "columns") and not purchase_df.empty:
            if "Month" in purchase_df.columns and "Amount" in purchase_df.columns:
                month_purchases = purchase_df[purchase_df["Month"] == month]
                purchases = month_purchases["Amount"].sum()
        row["purchases"] = purchases
        
        # 6. COGS = Opening Stock + Purchases - Closing Stock
        consumption_df = sources.get("consumption")
        cogs = calculate_cogs(consumption_df, purchase_df, month, material_columns)
        row["cogs"] = cogs
        
        # 7. Direct Expenses = Sum of Debit (from Direct Expenses sheet)
        direct_df = sources.get("direct_expenses")
        direct_expenses = 0.0
        if direct_df is not None and hasattr(direct_df, "columns") and not direct_df.empty:
            if "Month" in direct_df.columns and "Debit" in direct_df.columns:
                month_direct = direct_df[direct_df["Month"] == month]
                direct_expenses = month_direct["Debit"].sum()
        row["direct_expenses"] = direct_expenses
        
        # Total Direct Expenses
        total_direct_expenses = purchases + cogs + direct_expenses
        row["total_direct_expenses"] = total_direct_expenses
        
        # 8. Indirect Expenses = Sum of Debit (from Indirect Expenses sheet)
        indirect_expenses = 0.0
        if indirect_df is not None and hasattr(indirect_df, "columns") and not indirect_df.empty:
            if "Month" in indirect_df.columns and "Debit" in indirect_df.columns:
                month_indirect = indirect_df[indirect_df["Month"] == month]
                indirect_expenses = month_indirect["Debit"].sum()
        row["indirect_expenses"] = indirect_expenses
        
        # 9. Total Expenses
        total_expenses = total_direct_expenses + indirect_expenses
        row["total_expenses"] = total_expenses
        
        # PROFIT CALCULATIONS
        # 10. EBITDA = Total Income - Total Expenses
        ebitda = total_income - total_expenses
        row["ebitda"] = ebitda
        
        # 11. Depreciation (from Indirect Expenses - Expense Head)
        depreciation = extract_expense_by_type(indirect_df, month, DEPRECIATION_KEYWORDS)
        row["depreciation"] = depreciation
        
        # 12. EBIT = EBITDA - Depreciation
        ebit = ebitda - depreciation
        row["ebit"] = ebit
        
        # 13. Interest Expense (from Indirect Expenses - Expense Head)
        interest = extract_expense_by_type(indirect_df, month, INTEREST_KEYWORDS)
        row["interest"] = interest
        
        # 14. PBT = EBIT - Interest Expense
        pbt = ebit - interest
        row["pbt"] = pbt
        
        # 15. Tax = PBT × Tax Rate (2.168%)
        tax = calculate_tax(pbt, tax_rate)
        row["tax"] = tax
        
        # 16. PAT = PBT - Tax
        pat = pbt - tax
        row["pat"] = pat
        
        rows.append(row)
    
    return rows
