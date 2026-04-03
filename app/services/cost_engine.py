"""Cost allocation: consumption qty x monthly avg landed rate from purchase."""

from __future__ import annotations

import pandas as pd

from app.config import MATERIAL_COLUMNS, MATERIAL_MAPPING


def compute_cost_allocation(
    purchase_agg: pd.DataFrame,
    consumption_agg: pd.DataFrame,
) -> pd.DataFrame:
    """Compute material cost allocation for each Grade + PartyName.

    For each material, multiply consumption quantity by the average landed
    rate from purchase aggregation.

    Returns DataFrame with columns:
        Grade, PartyName, Month, TotalVolume, and cost columns for each material,
        plus TotalMaterialCost, CostPerM3.
    """
    if consumption_agg.empty:
        return pd.DataFrame(columns=[
            "Grade", "PartyName", "Month", "TotalVolume",
            "TotalMaterialCost", "CostPerM3",
        ])

    # Build lookup: ItemName -> AvgRate (base purchase rate, not landed)
    rate_lookup: dict[str, float] = {}
    if not purchase_agg.empty:
        for _, row in purchase_agg.iterrows():
            rate_lookup[row["ItemName"]] = row["AvgRate"]

    result_rows: list[dict] = []

    for _, cons_row in consumption_agg.iterrows():
        row_data: dict = {
            "Grade": cons_row["Grade"],
            "PartyName": cons_row["PartyName"],
            "Month": cons_row.get("Month", ""),
            "TotalVolume": cons_row["TotalQty"],
        }

        total_cost = 0.0

        for item_name, cons_cols in MATERIAL_MAPPING.items():
            avg_rate = rate_lookup.get(item_name, 0.0)
            material_qty = sum(
                cons_row.get(col, 0.0) for col in cons_cols
                if col in cons_row.index
            )
            cost = material_qty * avg_rate
            row_data[f"Cost_{item_name}"] = cost
            total_cost += cost

        row_data["TotalMaterialCost"] = total_cost
        volume = cons_row["TotalQty"]
        row_data["CostPerM3"] = total_cost / volume if volume > 0 else 0.0

        result_rows.append(row_data)

    return pd.DataFrame(result_rows)
