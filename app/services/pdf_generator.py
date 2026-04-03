"""PDF report builder using reportlab."""

from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.session import MonthData


def _heading_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor("#1a237e"),
    )


def _subheading_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "CustomSubHeading",
        parent=styles["Heading2"],
        fontSize=13,
        spaceAfter=8,
        textColor=colors.HexColor("#283593"),
    )


def _body_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontSize=9,
        spaceAfter=4,
    )


def _fmt(val: float) -> str:
    """Format number with commas and 2 decimal places."""
    if abs(val) >= 1:
        return f"{val:,.2f}"
    return f"{val:.4f}"


def _build_kpi_table(data: MonthData) -> Table:
    """Build executive summary KPI boxes."""
    prof = data.profitability
    if prof.empty:
        return Table([["No profitability data available"]])

    total_revenue = prof["Revenue"].sum()
    total_cost = prof["Cost"].sum()
    total_margin = prof["Margin"].sum()
    total_volume = prof["Volume"].sum()
    profit_pct = (total_margin / total_revenue * 100) if total_revenue > 0 else 0

    kpi_data = [
        ["KPI", "Value"],
        ["Total Revenue", f"Rs. {_fmt(total_revenue)}"],
        ["Total Cost", f"Rs. {_fmt(total_cost)}"],
        ["Gross Margin", f"Rs. {_fmt(total_margin)}"],
        ["Total Volume (m3)", _fmt(total_volume)],
        ["Avg Revenue/m3", f"Rs. {_fmt(total_revenue / total_volume if total_volume else 0)}"],
        ["Avg Cost/m3", f"Rs. {_fmt(total_cost / total_volume if total_volume else 0)}"],
        ["Avg Margin/m3", f"Rs. {_fmt(total_margin / total_volume if total_volume else 0)}"],
        ["Profit %", f"{profit_pct:.1f}%"],
        ["Unique Grades", str(prof["Grade"].nunique())],
        ["Unique Customers", str(prof["PartyName"].nunique())],
    ]

    table = Table(kpi_data, colWidths=[200, 250])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _build_grade_table(data: MonthData) -> Table:
    """Build grade-wise profitability table."""
    prof = data.profitability
    if prof.empty:
        return Table([["No grade data available"]])

    grade_agg = prof.groupby("Grade", as_index=False).agg(
        Volume=("Volume", "sum"),
        Revenue=("Revenue", "sum"),
        Cost=("Cost", "sum"),
        Margin=("Margin", "sum"),
    )
    grade_agg["Margin/m3"] = grade_agg.apply(
        lambda r: r["Margin"] / r["Volume"] if r["Volume"] > 0 else 0, axis=1
    )
    grade_agg["Profit%"] = grade_agg.apply(
        lambda r: r["Margin"] / r["Revenue"] * 100 if r["Revenue"] > 0 else 0, axis=1
    )
    grade_agg = grade_agg.sort_values("Revenue", ascending=False)

    header = ["Grade", "Volume", "Revenue", "Cost", "Margin", "Margin/m3", "Profit%"]
    rows = [header]
    for _, r in grade_agg.iterrows():
        rows.append([
            str(r["Grade"]),
            _fmt(r["Volume"]),
            _fmt(r["Revenue"]),
            _fmt(r["Cost"]),
            _fmt(r["Margin"]),
            _fmt(r["Margin/m3"]),
            f"{r['Profit%']:.1f}%",
        ])

    table = Table(rows, colWidths=[100, 65, 80, 80, 80, 70, 55])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _build_customer_table(data: MonthData) -> Table:
    """Build customer analysis table."""
    prof = data.profitability
    if prof.empty:
        return Table([["No customer data available"]])

    cust_agg = prof.groupby("PartyName", as_index=False).agg(
        Grades=("Grade", lambda x: ", ".join(sorted(x.unique()))),
        Volume=("Volume", "sum"),
        Revenue=("Revenue", "sum"),
        Cost=("Cost", "sum"),
        Margin=("Margin", "sum"),
    )
    cust_agg["Profit%"] = cust_agg.apply(
        lambda r: r["Margin"] / r["Revenue"] * 100 if r["Revenue"] > 0 else 0, axis=1
    )
    cust_agg = cust_agg.sort_values("Revenue", ascending=False).head(30)

    header = ["Customer", "Grades", "Volume", "Revenue", "Cost", "Margin", "Profit%"]
    rows = [header]
    for _, r in cust_agg.iterrows():
        name = str(r["PartyName"])
        if len(name) > 30:
            name = name[:27] + "..."
        grades = str(r["Grades"])
        if len(grades) > 25:
            grades = grades[:22] + "..."
        rows.append([
            name, grades,
            _fmt(r["Volume"]),
            _fmt(r["Revenue"]),
            _fmt(r["Cost"]),
            _fmt(r["Margin"]),
            f"{r['Profit%']:.1f}%",
        ])

    table = Table(rows, colWidths=[110, 80, 60, 75, 75, 70, 50])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def _build_material_table(data: MonthData) -> Table:
    """Build raw material summary table."""
    from app.config import MATERIAL_MAPPING

    purchase_agg = data.purchase_agg
    consumption_agg = data.consumption_agg

    if purchase_agg.empty:
        return Table([["No material data available"]])

    header = ["Material", "Purchased Qty", "Purchased Amt", "Avg Rate", "Avg L.Rate", "Consumed Qty", "Balance"]
    rows = [header]

    for item_name, cons_cols in MATERIAL_MAPPING.items():
        p_row = purchase_agg[purchase_agg["ItemName"] == item_name]
        p_qty = p_row["TotalQty"].sum() if not p_row.empty else 0
        p_amt = p_row["TotalAmount"].sum() if not p_row.empty else 0
        avg_rate = p_row["AvgRate"].mean() if not p_row.empty else 0
        avg_lrate = p_row["AvgLRate"].mean() if not p_row.empty else 0

        c_qty = 0.0
        if not consumption_agg.empty:
            for col in cons_cols:
                if col in consumption_agg.columns:
                    c_qty += consumption_agg[col].sum()

        rows.append([
            item_name,
            _fmt(p_qty),
            _fmt(p_amt),
            _fmt(avg_rate),
            _fmt(avg_lrate),
            _fmt(c_qty),
            _fmt(p_qty - c_qty),
        ])

    table = Table(rows, colWidths=[90, 70, 80, 65, 65, 75, 70])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _build_production_table(data: MonthData) -> Table:
    """Build production summary table."""
    from app.config import MATERIAL_COLUMNS

    cons = data.consumption_agg
    if cons.empty:
        return Table([["No production data available"]])

    grade_agg_dict: dict[str, tuple[str, str]] = {
        "TotalVolume": ("TotalQty", "sum"),
        "TotalBatches": ("Batches", "sum"),
    }
    for col in MATERIAL_COLUMNS:
        if col in cons.columns:
            grade_agg_dict[col] = (col, "sum")

    grade_prod = cons.groupby("Grade", as_index=False).agg(**grade_agg_dict)
    grade_prod["AvgBatchSize"] = grade_prod.apply(
        lambda r: r["TotalVolume"] / r["TotalBatches"] if r["TotalBatches"] > 0 else 0,
        axis=1,
    )
    grade_prod = grade_prod.sort_values("TotalVolume", ascending=False)

    header = ["Grade", "Batches", "Volume", "Avg Batch", "Cem/m3", "Agg/m3", "Sand/m3"]
    rows = [header]
    for _, r in grade_prod.iterrows():
        vol = r["TotalVolume"]
        cem_per = r.get("Cem", 0) / vol if vol > 0 else 0
        agg_per = (r.get("10mm", 0) + r.get("20mm", 0)) / vol if vol > 0 else 0
        sand_per = (r.get("CSand", 0) + r.get("CSand.1", 0)) / vol if vol > 0 else 0

        rows.append([
            str(r["Grade"]),
            str(int(r["TotalBatches"])),
            _fmt(vol),
            _fmt(r["AvgBatchSize"]),
            _fmt(cem_per),
            _fmt(agg_per),
            _fmt(sand_per),
        ])

    table = Table(rows, colWidths=[100, 60, 70, 70, 70, 70, 70])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a237e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def generate_pdf(data: MonthData, month: str) -> bytes:
    """Generate a complete PDF report for a given month."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=40,
        bottomMargin=40,
    )

    heading = _heading_style()
    subheading = _subheading_style()
    body = _body_style()
    elements: list[Any] = []

    # Page 1: Executive Summary
    elements.append(Paragraph(f"RMC Plant Sales Analysis Report", heading))
    elements.append(Paragraph(f"Month: {month}", subheading))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Executive Summary", subheading))
    elements.append(Spacer(1, 6))
    elements.append(_build_kpi_table(data))
    elements.append(PageBreak())

    # Page 2-3: Grade-wise profitability
    elements.append(Paragraph("Grade-wise Profitability", heading))
    elements.append(Spacer(1, 8))
    elements.append(_build_grade_table(data))
    elements.append(PageBreak())

    # Page 4-5: Customer analysis
    elements.append(Paragraph("Customer Analysis", heading))
    elements.append(Spacer(1, 8))
    elements.append(_build_customer_table(data))
    elements.append(PageBreak())

    # Page 6: Raw material summary
    elements.append(Paragraph("Raw Material Summary", heading))
    elements.append(Spacer(1, 8))
    elements.append(_build_material_table(data))
    elements.append(PageBreak())

    # Page 7: Production summary
    elements.append(Paragraph("Production Summary", heading))
    elements.append(Spacer(1, 8))
    elements.append(_build_production_table(data))

    doc.build(elements)
    return buffer.getvalue()
