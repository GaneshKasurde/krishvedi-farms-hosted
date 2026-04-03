"""Krishvedi Farms analysis endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

from app.models.session import store


router = APIRouter()


@router.get("/krishvedi/overview")
async def krishvedi_overview(
    session_id: str = Query(...),
    month: str | None = Query(None),
) -> dict[str, Any]:
    """Get overview summary for Krishvedi data."""
    if not session_id:
        return {"months": [], "error": "session_id required"}

    session = store.get(session_id)
    if not session:
        return {"error": "Session not found", "months": []}

    if not session.months:
        return {"error": "No data", "months": []}

    # Get all months
    all_months = sorted(session.months.keys())
    
    print(f"DEBUG: Session {session_id} has months: {all_months}")
    
    # Check Vch Type values in first month
    if all_months:
        first_month_data = session.months[all_months[0]].krishvedi_raw
        if "Vch Type" in first_month_data.columns:
            print(f"DEBUG: Unique Vch Types: {first_month_data['Vch Type'].unique().tolist()}")
        if "Category" in first_month_data.columns:
            print(f"DEBUG: Unique Categories: {first_month_data['Category'].unique().tolist()}")

    # Filter months
    months_to_show = [month] if month and month in session.months else all_months

    result = {"months": [], "all_months": all_months}

    print(f"DEBUG: Processing {len(all_months)} months: {all_months}")

    for m in months_to_show:
        month_data = session.months[m]

        # Get raw data
        raw_df = month_data.krishvedi_raw

        print(f"DEBUG: Month {m} - raw_df shape: {raw_df.shape}")
        print(f"DEBUG: Month {m} - columns: {list(raw_df.columns)}")

        if raw_df.empty:
            continue

        # Calculate totals
        sales = raw_df[raw_df["Category"] == "sale"]["Value_1"].sum() if "Value_1" in raw_df.columns else 0
        purchase = raw_df[raw_df["Category"] == "purchase"]["Value"].sum() if "Value" in raw_df.columns else 0
        consumption = raw_df[raw_df["Category"] == "consumption"]["Consumption"].sum() if "Consumption" in raw_df.columns else 0
        
        print(f"DEBUG: {m} - sales: {sales}, purchase: {purchase}, consumption: {consumption}")

        # Get closing balance - Vch Type = "Balance" 
        closing_balance = 0
        if "Balance" in raw_df.columns and "Vch Type" in raw_df.columns:
            balance_rows = raw_df[raw_df["Vch Type"] == "Balance"]
            closing_balance = balance_rows["Balance"].sum()
            print(f"DEBUG: {m} - Vch Type=B Balance rows: {len(balance_rows)}, closing: {closing_balance}")

        # Get opening balance - Vch Type = "Opening Balance"
        opening_balance = 0
        if "Balance" in raw_df.columns and "Vch Type" in raw_df.columns:
            opening_rows = raw_df[raw_df["Vch Type"] == "Opening Balance"]
            opening_balance = opening_rows["Balance"].sum()
            print(f"DEBUG: {m} - Vch Type=Opening Balance rows: {len(opening_rows)}, opening: {opening_balance}")

        # If opening balance is 0 and not first month, use previous month's closing
        idx = all_months.index(m)
        if opening_balance == 0 and idx > 0:
            # Look at ALL previous months' closing
            for pm in all_months[:idx]:
                pm_data = session.months[pm].krishvedi_raw
                if "Vch Type" in pm_data.columns and "Balance" in pm_data.columns:
                    pm_closing = pm_data[pm_data["Vch Type"] == "Balance"]["Balance"].sum()
                    if pm_closing != 0:
                        opening_balance = pm_closing
                        print(f"DEBUG: {m} - using {pm} closing as opening: {opening_balance}")
                        break

        # Gross profit = Opening Balance + Purchase - Sales - Closing Balance
        gross_profit = opening_balance + purchase - sales - closing_balance

        # Get unique counts
        unique_items = raw_df["Items"].nunique() if "Items" in raw_df.columns else 0
        unique_parties = raw_df["Party"].nunique() if "Party" in raw_df.columns else 0

        print(f"DEBUG: {m} - sales: {sales}, purchase: {purchase}, closing: {closing_balance}, opening: {opening_balance}, profit: {gross_profit}")

        result["months"].append({
            "month": m,
            "sales": sales,
            "purchases": purchase,
            "consumption": consumption,
            "closing_balance": closing_balance,
            "opening_balance": opening_balance,
            "gross_profit": gross_profit,
            "unique_items": unique_items,
            "unique_parties": unique_parties,
        })

    # Add chart data for all months
    chart_data = []
    item_trend_data = []
    party_trend_data = []
    day_sales_data = []
    
    for m in all_months:
        if m in session.months:
            md = session.months[m]
            rd = md.krishvedi_raw
            if not rd.empty:
                chart_data.append({
                    "month": m,
                    "sales": rd[rd["Category"] == "sale"]["Value_1"].sum() if "Value_1" in rd.columns else 0,
                    "purchase": rd[rd["Category"] == "purchase"]["Value"].sum() if "Value" in rd.columns else 0,
                    "consumption": rd[rd["Category"] == "consumption"]["Consumption"].sum() if "Consumption" in rd.columns else 0,
                })
                
                # Item trends - top 5 items by sales this month
                if "Items" in rd.columns and "Category" in rd.columns:
                    sale_df = rd[rd["Category"] == "sale"]
                    if not sale_df.empty:
                        top_items = sale_df.groupby("Items")["Value_1"].sum().nlargest(5).index.tolist()
                        for item in top_items:
                            item_sales = sale_df[sale_df["Items"] == item]["Value_1"].sum()
                            item_trend_data.append({"month": m, "item": item, "sales": item_sales})
                
                # Party trends - top 5 parties by sales this month
                if "Party" in rd.columns and "Category" in rd.columns:
                    sale_df = rd[rd["Category"] == "sale"]
                    if not sale_df.empty:
                        top_parties = sale_df.groupby("Party")["Value_1"].sum().nlargest(5).index.tolist()
                        for party in top_parties:
                            party_sales = sale_df[sale_df["Party"] == party]["Value_1"].sum()
                            party_trend_data.append({"month": m, "party": party, "sales": party_sales})

                # Day-wise sales data
                if "Date" in rd.columns and "Category" in rd.columns:
                    sale_df = rd[rd["Category"] == "sale"]
                    if not sale_df.empty:
                        sale_df = sale_df.copy()
                        sale_df["Day"] = sale_df["Date"].dt.day
                        day_sales = sale_df.groupby("Day")["Value_1"].sum()
                        for day, sales in day_sales.items():
                            day_sales_data.append({"month": m, "day": int(day), "sales": sales})
    
    # Calculate top 5 parties by gross profit (using Gross Profit column)
    party_profit = {}
    for m in all_months:
        if m in session.months:
            rd = session.months[m].krishvedi_raw
            if not rd.empty and "Party" in rd.columns and "Category" in rd.columns:
                # For sales, get the Gross Profit column
                sale_df = rd[rd["Category"] == "sale"]
                if not sale_df.empty and "Gross Profit" in sale_df.columns:
                    for party in sale_df["Party"].unique():
                        party_gp = sale_df[sale_df["Party"] == party]["Gross Profit"].sum()
                        if party not in party_profit:
                            party_profit[party] = 0
                        party_profit[party] += party_gp
    
    top_profit_parties = sorted(party_profit.items(), key=lambda x: x[1], reverse=True)[:5]
    profit_pie_data = [{"party": p[0], "profit": p[1]} for p in top_profit_parties]
    
    result["chart_data"] = chart_data
    result["item_trend_data"] = item_trend_data
    result["party_trend_data"] = party_trend_data
    result["day_sales_data"] = day_sales_data
    result["profit_pie_data"] = profit_pie_data
    
    print(f"DEBUG: chart_data: {len(chart_data)} items")
    print(f"DEBUG: item_trend_data: {len(item_trend_data)} items")
    print(f"DEBUG: party_trend_data: {len(party_trend_data)} items")
    print(f"DEBUG: day_sales_data: {day_sales_data}")
    print(f"DEBUG: profit_pie_data: {profit_pie_data}")

    return result


@router.get("/krishvedi/items")
async def krishvedi_items(
    session_id: str = Query(...),
    month: str | None = Query(None),
    category: str | None = Query(None),
) -> dict[str, Any]:
    """Get item-wise data for Krishvedi."""
    if not session_id:
        return {"items": [], "error": "session_id required"}

    session = store.get(session_id)
    if not session:
        return {"error": "Session not found", "items": []}

    if not session.months:
        return {"error": "No data", "items": []}

    # Use first month if not specified
    month = month or list(session.months.keys())[0]

    if month not in session.months:
        return {"error": f"Month {month} not found", "items": []}

    month_data = session.months[month]
    raw_df = month_data.krishvedi_raw

    if raw_df.empty:
        return {"items": []}

    # Filter by category if specified
    if category and category != "all":
        raw_df = raw_df[raw_df["Category"] == category]

    # Group by Items
    if "Items" not in raw_df.columns:
        return {"items": []}

    items_data = []

    for item in raw_df["Items"].unique():
        item_df = raw_df[raw_df["Items"] == item]

        sales = item_df[item_df["Category"] == "sale"]["Value_1"].sum() if "Value_1" in item_df.columns else 0
        purchase = item_df[item_df["Category"] == "purchase"]["Value"].sum() if "Value" in item_df.columns else 0
        consumption = item_df[item_df["Category"] == "consumption"]["Consumption"].sum() if "Consumption" in item_df.columns else 0
        qty_in = item_df[item_df["Category"] == "purchase"]["Inwards_QTY"].sum() if "Inwards_QTY" in item_df.columns else 0
        qty_out = item_df[item_df["Category"] == "sale"]["Outwards_QTY"].sum() if "Outwards_QTY" in item_df.columns else 0

        items_data.append({
            "item": item,
            "sales": sales,
            "purchase": purchase,
            "consumption": consumption,
            "qty_in": qty_in,
            "qty_out": qty_out,
            "gross_profit": sales - purchase,
        })

    # Sort by sales
    items_data.sort(key=lambda x: x["sales"], reverse=True)

    return {"items": items_data, "month": month}


@router.get("/krishvedi/parties")
async def krishvedi_parties(
    session_id: str = Query(...),
    month: str | None = Query(None),
) -> dict[str, Any]:
    """Get party-wise data for Krishvedi."""
    if not session_id:
        return {"parties": [], "error": "session_id required"}

    session = store.get(session_id)
    if not session:
        return {"error": "Session not found", "parties": []}

    if not session.months:
        return {"error": "No data", "parties": []}

    # Use first month if not specified
    month = month or list(session.months.keys())[0]

    if month not in session.months:
        return {"error": f"Month {month} not found", "parties": []}

    month_data = session.months[month]
    raw_df = month_data.krishvedi_raw

    if raw_df.empty or "Party" not in raw_df.columns:
        return {"parties": []}

    # Group by Party for sales
    sales_df = raw_df[raw_df["Category"] == "sale"]

    parties_data = []

    for party in sales_df["Party"].unique():
        party_df = sales_df[sales_df["Party"] == party]

        sales = party_df["Value_1"].sum() if "Value_1" in party_df.columns else 0
        qty = party_df["Outwards_QTY"].sum() if "Outwards_QTY" in party_df.columns else 0
        profit = party_df["Gross Profit"].sum() if "Gross Profit" in party_df.columns else 0

        parties_data.append({
            "party": party,
            "sales": sales,
            "qty": qty,
            "gross_profit": profit,
        })

    # Sort by sales
    parties_data.sort(key=lambda x: x["sales"], reverse=True)

    return {"parties": parties_data, "month": month}
