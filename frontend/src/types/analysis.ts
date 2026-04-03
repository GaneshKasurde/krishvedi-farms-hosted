/* TypeScript types matching backend Pydantic schemas */

// --- Upload ---

export interface UploadSummary {
  purchase_rows: number;
  sales_rows: number;
  consumption_rows: number;
  unique_grades: number;
  unique_customers: number;
  unique_materials: number;
}

export interface UploadResponse {
  session_id: string;
  month: string;
  months: string[];
  summary: UploadSummary;
  validation_warnings: string[];
}

// --- Overview ---

export interface MonthKPI {
  month: string;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  total_volume: number;
  avg_revenue_per_m3: number;
  avg_cost_per_m3: number;
  avg_margin_per_m3: number;
  profit_pct: number;
  unique_grades: number;
  unique_customers: number;
}

export interface OverviewResponse {
  months: MonthKPI[];
}

// --- Grade Profitability ---

export interface GradeProfitability {
  grade: string;
  volume: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_per_m3: number;
  profit_pct: number;
}

export interface GradeProfitabilityResponse {
  month: string;
  grades: GradeProfitability[];
}

// --- Customer Analysis ---

export interface CustomerAnalysis {
  party_name: string;
  grades: string[];
  volume: number;
  revenue: number;
  cost: number;
  margin: number;
  profit_pct: number;
}

export interface CustomerAnalysisResponse {
  month: string;
  customers: CustomerAnalysis[];
}

// --- Material Analysis ---

export interface MaterialAnalysis {
  material: string;
  purchased_qty: number;
  purchased_amount: number;
  avg_rate: number;
  avg_landed_rate: number;
  consumed_qty: number;
  consumed_cost: number;
  balance_qty: number;
}

export interface MaterialAnalysisResponse {
  month: string;
  materials: MaterialAnalysis[];
}

// --- Production Analysis ---

export interface ProductionAnalysis {
  grade: string;
  batches: number;
  volume: number;
  avg_batch_size: number;
  material_per_m3: Record<string, number>;
}

export interface ProductionAnalysisResponse {
  month: string;
  productions: ProductionAnalysis[];
}

// --- Trends ---

export interface TrendPoint {
  month: string;
  value: number;
}

export interface TrendSeries {
  name: string;
  data: TrendPoint[];
}

export interface TrendsResponse {
  series: TrendSeries[];
}

// --- Session ---

export interface SessionStatusResponse {
  session_id: string;
  months_loaded: string[];
  created_at: number;
  last_accessed: number;
}

export interface DeleteResponse {
  deleted: boolean;
}
