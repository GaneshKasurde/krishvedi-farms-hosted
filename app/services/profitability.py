"""Profitability calculations: revenue - cost = margin."""

from __future__ import annotations

import pandas as pd


def compute_profitability(
    sales_agg: pd.DataFrame,
    cost_allocation: pd.DataFrame,
) -> pd.DataFrame:
    """Merge sales revenue with cost allocation to compute profitability.

    Returns DataFrame with columns:
        Grade, PartyName, Month, Volume, Revenue, Cost,
        Margin, MarginPerM3, ProfitPct
    """
    if sales_agg.empty:
        return pd.DataFrame(columns=[
            "Grade", "PartyName", "Month", "Volume", "Revenue", "Cost",
            "Margin", "MarginPerM3", "ProfitPct",
        ])

    # Prepare sales side
    sales = sales_agg[["Grade", "PartyName", "Month", "TotalQty", "TotalAmount"]].copy()
    sales = sales.rename(columns={"TotalQty": "Volume", "TotalAmount": "Revenue"})

    # Prepare cost side
    if cost_allocation.empty:
        sales["Cost"] = 0.0
    else:
        cost = cost_allocation[["Grade", "PartyName", "Month", "TotalMaterialCost"]].copy()
        cost = cost.rename(columns={"TotalMaterialCost": "Cost"})
        sales = sales.merge(cost, on=["Grade", "PartyName", "Month"], how="left")
        sales["Cost"] = sales["Cost"].fillna(0.0)

    sales["Margin"] = sales["Revenue"] - sales["Cost"]
    sales["MarginPerM3"] = sales.apply(
        lambda r: r["Margin"] / r["Volume"] if r["Volume"] > 0 else 0.0, axis=1
    )
    sales["ProfitPct"] = sales.apply(
        lambda r: (r["Margin"] / r["Revenue"] * 100) if r["Revenue"] > 0 else 0.0,
        axis=1,
    )

    return sales
