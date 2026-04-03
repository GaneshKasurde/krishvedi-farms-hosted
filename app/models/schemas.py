"""Pydantic request/response models."""

from __future__ import annotations

from pydantic import BaseModel


# --- Upload ---

class UploadSummary(BaseModel):
    purchase_rows: int
    sales_rows: int
    consumption_rows: int
    unique_grades: int
    unique_customers: int
    unique_materials: int


class UploadResponse(BaseModel):
    session_id: str
    month: str
    summary: UploadSummary
    validation_warnings: list[str]


# --- Overview ---

class MonthKPI(BaseModel):
    month: str
    total_revenue: float
    total_cost: float
    total_margin: float
    total_volume: float
    avg_revenue_per_m3: float
    avg_cost_per_m3: float
    avg_margin_per_m3: float
    profit_pct: float
    unique_grades: int
    unique_customers: int


class OverviewResponse(BaseModel):
    months: list[MonthKPI]


# --- Grade Profitability ---

class GradeProfitability(BaseModel):
    grade: str
    volume: float
    revenue: float
    cost: float
    margin: float
    margin_per_m3: float
    profit_pct: float


class GradeProfitabilityResponse(BaseModel):
    month: str
    grades: list[GradeProfitability]


# --- Customer Analysis ---

class CustomerAnalysis(BaseModel):
    party_name: str
    grades: list[str]
    volume: float
    revenue: float
    cost: float
    margin: float
    profit_pct: float


class CustomerAnalysisResponse(BaseModel):
    month: str
    customers: list[CustomerAnalysis]


# --- Material Analysis ---

class MaterialAnalysis(BaseModel):
    material: str
    purchased_qty: float
    purchased_amount: float
    avg_rate: float
    avg_landed_rate: float
    consumed_qty: float
    consumed_cost: float
    balance_qty: float


class MaterialAnalysisResponse(BaseModel):
    month: str
    materials: list[MaterialAnalysis]


# --- Production Analysis ---

class ProductionAnalysis(BaseModel):
    grade: str
    batches: int
    volume: float
    avg_batch_size: float
    material_per_m3: dict[str, float]


class ProductionAnalysisResponse(BaseModel):
    month: str
    productions: list[ProductionAnalysis]


# --- Trends ---

class TrendPoint(BaseModel):
    month: str
    value: float


class TrendSeries(BaseModel):
    name: str
    data: list[TrendPoint]


class TrendsResponse(BaseModel):
    series: list[TrendSeries]


# --- Session ---

class SessionStatusResponse(BaseModel):
    session_id: str
    months_loaded: list[str]
    created_at: float
    last_accessed: float


class DeleteResponse(BaseModel):
    deleted: bool
