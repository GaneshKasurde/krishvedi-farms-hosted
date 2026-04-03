"""Analysis data endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.config import MATERIAL_MAPPING
from app.models.schemas import (
    CustomerAnalysis,
    CustomerAnalysisResponse,
    GradeProfitability,
    GradeProfitabilityResponse,
    MaterialAnalysis,
    MaterialAnalysisResponse,
    MonthKPI,
    OverviewResponse,
    ProductionAnalysis,
    ProductionAnalysisResponse,
    TrendPoint,
    TrendSeries,
    TrendsResponse,
)
from app.models.session import Session, store

router = APIRouter(prefix="/analysis")


def _get_session(session_id: str) -> Session:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session


def _require_month(session: Session, month: str):
    if month not in session.months:
        raise HTTPException(
            status_code=404,
            detail=f"Month {month} not loaded. Available: {list(session.months.keys())}",
        )
    return session.months[month]


@router.get("/overview", response_model=OverviewResponse)
async def overview(session_id: str = Query(...)) -> OverviewResponse:
    """All months KPIs and trends."""
    session = _get_session(session_id)
    months_kpi: list[MonthKPI] = []

    for month_key in sorted(session.months.keys()):
        md = session.months[month_key]
        prof = md.profitability

        if prof.empty:
            months_kpi.append(MonthKPI(
                month=month_key, total_revenue=0, total_cost=0, total_margin=0,
                total_volume=0, avg_revenue_per_m3=0, avg_cost_per_m3=0,
                avg_margin_per_m3=0, profit_pct=0, unique_grades=0, unique_customers=0,
            ))
            continue

        total_revenue = float(prof["Revenue"].sum())
        total_cost = float(prof["Cost"].sum())
        total_margin = float(prof["Margin"].sum())
        total_volume = float(prof["Volume"].sum())

        months_kpi.append(MonthKPI(
            month=month_key,
            total_revenue=total_revenue,
            total_cost=total_cost,
            total_margin=total_margin,
            total_volume=total_volume,
            avg_revenue_per_m3=total_revenue / total_volume if total_volume > 0 else 0,
            avg_cost_per_m3=total_cost / total_volume if total_volume > 0 else 0,
            avg_margin_per_m3=total_margin / total_volume if total_volume > 0 else 0,
            profit_pct=(total_margin / total_revenue * 100) if total_revenue > 0 else 0,
            unique_grades=int(prof["Grade"].nunique()),
            unique_customers=int(prof["PartyName"].nunique()),
        ))

    return OverviewResponse(months=months_kpi)


@router.get("/grade-profitability", response_model=GradeProfitabilityResponse)
async def grade_profitability(
    session_id: str = Query(...),
    month: str = Query(...),
) -> GradeProfitabilityResponse:
    """Grade-wise profitability for a given month."""
    session = _get_session(session_id)
    md = _require_month(session, month)
    prof = md.profitability

    if prof.empty:
        return GradeProfitabilityResponse(month=month, grades=[])

    grade_agg = prof.groupby("Grade", as_index=False).agg(
        Volume=("Volume", "sum"),
        Revenue=("Revenue", "sum"),
        Cost=("Cost", "sum"),
        Margin=("Margin", "sum"),
    )
    grade_agg["MarginPerM3"] = grade_agg.apply(
        lambda r: r["Margin"] / r["Volume"] if r["Volume"] > 0 else 0, axis=1
    )
    grade_agg["ProfitPct"] = grade_agg.apply(
        lambda r: r["Margin"] / r["Revenue"] * 100 if r["Revenue"] > 0 else 0, axis=1
    )

    grades = [
        GradeProfitability(
            grade=str(r["Grade"]),
            volume=float(r["Volume"]),
            revenue=float(r["Revenue"]),
            cost=float(r["Cost"]),
            margin=float(r["Margin"]),
            margin_per_m3=float(r["MarginPerM3"]),
            profit_pct=float(r["ProfitPct"]),
        )
        for _, r in grade_agg.iterrows()
    ]

    return GradeProfitabilityResponse(month=month, grades=grades)


@router.get("/customers", response_model=CustomerAnalysisResponse)
async def customers(
    session_id: str = Query(...),
    month: str = Query(...),
) -> CustomerAnalysisResponse:
    """Customer-wise analysis for a given month."""
    session = _get_session(session_id)
    md = _require_month(session, month)
    prof = md.profitability

    if prof.empty:
        return CustomerAnalysisResponse(month=month, customers=[])

    cust_agg = prof.groupby("PartyName", as_index=False).agg(
        Grades=("Grade", lambda x: list(sorted(x.unique()))),
        Volume=("Volume", "sum"),
        Revenue=("Revenue", "sum"),
        Cost=("Cost", "sum"),
        Margin=("Margin", "sum"),
    )
    cust_agg["ProfitPct"] = cust_agg.apply(
        lambda r: r["Margin"] / r["Revenue"] * 100 if r["Revenue"] > 0 else 0, axis=1
    )

    customers_list = [
        CustomerAnalysis(
            party_name=str(r["PartyName"]),
            grades=r["Grades"],
            volume=float(r["Volume"]),
            revenue=float(r["Revenue"]),
            cost=float(r["Cost"]),
            margin=float(r["Margin"]),
            profit_pct=float(r["ProfitPct"]),
        )
        for _, r in cust_agg.iterrows()
    ]

    return CustomerAnalysisResponse(month=month, customers=customers_list)


@router.get("/materials", response_model=MaterialAnalysisResponse)
async def materials(
    session_id: str = Query(...),
    month: str = Query(...),
) -> MaterialAnalysisResponse:
    """Material-wise analysis for a given month."""
    session = _get_session(session_id)
    md = _require_month(session, month)

    purchase_agg = md.purchase_agg
    consumption_agg = md.consumption_agg
    cost_alloc = md.cost_allocation

    materials_list: list[MaterialAnalysis] = []

    for item_name, cons_cols in MATERIAL_MAPPING.items():
        # Purchase side
        p_rows = purchase_agg[purchase_agg["ItemName"] == item_name] if not purchase_agg.empty else None
        p_qty = float(p_rows["TotalQty"].sum()) if p_rows is not None and not p_rows.empty else 0.0
        p_amt = float(p_rows["TotalAmount"].sum()) if p_rows is not None and not p_rows.empty else 0.0
        avg_rate = float(p_rows["AvgRate"].mean()) if p_rows is not None and not p_rows.empty else 0.0
        avg_lrate = float(p_rows["AvgLRate"].mean()) if p_rows is not None and not p_rows.empty else 0.0

        # Consumption side
        c_qty = 0.0
        if not consumption_agg.empty:
            for col in cons_cols:
                if col in consumption_agg.columns:
                    c_qty += float(consumption_agg[col].sum())

        # Consumed cost from cost allocation
        c_cost = 0.0
        cost_col = f"Cost_{item_name}"
        if not cost_alloc.empty and cost_col in cost_alloc.columns:
            c_cost = float(cost_alloc[cost_col].sum())

        materials_list.append(MaterialAnalysis(
            material=item_name,
            purchased_qty=p_qty,
            purchased_amount=p_amt,
            avg_rate=avg_rate,
            avg_landed_rate=avg_lrate,
            consumed_qty=c_qty,
            consumed_cost=c_cost,
            balance_qty=p_qty - c_qty,
        ))

    return MaterialAnalysisResponse(month=month, materials=materials_list)


@router.get("/production", response_model=ProductionAnalysisResponse)
async def production(
    session_id: str = Query(...),
    month: str = Query(...),
) -> ProductionAnalysisResponse:
    """Grade-wise production analysis for a given month."""
    from app.config import MATERIAL_COLUMNS

    session = _get_session(session_id)
    md = _require_month(session, month)
    cons = md.consumption_agg

    if cons.empty:
        return ProductionAnalysisResponse(month=month, productions=[])

    agg_dict: dict[str, tuple[str, str]] = {
        "TotalVolume": ("TotalQty", "sum"),
        "TotalBatches": ("Batches", "sum"),
    }
    for col in MATERIAL_COLUMNS:
        if col in cons.columns:
            agg_dict[col] = (col, "sum")

    grade_prod = cons.groupby("Grade", as_index=False).agg(**agg_dict)

    productions: list[ProductionAnalysis] = []
    for _, r in grade_prod.iterrows():
        vol = float(r["TotalVolume"])
        batches = int(r["TotalBatches"])
        mat_per_m3: dict[str, float] = {}
        for col in MATERIAL_COLUMNS:
            if col in r.index:
                mat_per_m3[col] = float(r[col]) / vol if vol > 0 else 0.0

        productions.append(ProductionAnalysis(
            grade=str(r["Grade"]),
            batches=batches,
            volume=vol,
            avg_batch_size=vol / batches if batches > 0 else 0.0,
            material_per_m3=mat_per_m3,
        ))

    return ProductionAnalysisResponse(month=month, productions=productions)


@router.get("/trends", response_model=TrendsResponse)
async def trends(session_id: str = Query(...)) -> TrendsResponse:
    """Month-over-month trends for all KPIs."""
    session = _get_session(session_id)

    series_data: dict[str, list[TrendPoint]] = {
        "revenue": [],
        "cost": [],
        "margin": [],
        "volume": [],
        "profit_pct": [],
        "avg_revenue_per_m3": [],
        "avg_cost_per_m3": [],
        "avg_margin_per_m3": [],
    }

    for month_key in sorted(session.months.keys()):
        md = session.months[month_key]
        prof = md.profitability

        if prof.empty:
            for key in series_data:
                series_data[key].append(TrendPoint(month=month_key, value=0))
            continue

        rev = float(prof["Revenue"].sum())
        cost = float(prof["Cost"].sum())
        margin = float(prof["Margin"].sum())
        vol = float(prof["Volume"].sum())

        series_data["revenue"].append(TrendPoint(month=month_key, value=rev))
        series_data["cost"].append(TrendPoint(month=month_key, value=cost))
        series_data["margin"].append(TrendPoint(month=month_key, value=margin))
        series_data["volume"].append(TrendPoint(month=month_key, value=vol))
        series_data["profit_pct"].append(TrendPoint(
            month=month_key, value=(margin / rev * 100) if rev > 0 else 0,
        ))
        series_data["avg_revenue_per_m3"].append(TrendPoint(
            month=month_key, value=rev / vol if vol > 0 else 0,
        ))
        series_data["avg_cost_per_m3"].append(TrendPoint(
            month=month_key, value=cost / vol if vol > 0 else 0,
        ))
        series_data["avg_margin_per_m3"].append(TrendPoint(
            month=month_key, value=margin / vol if vol > 0 else 0,
        ))

    return TrendsResponse(
        series=[TrendSeries(name=k, data=v) for k, v in series_data.items()]
    )
