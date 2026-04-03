from pathlib import Path

# Session settings
SESSION_EXPIRY_MINUTES: int = 30
SESSION_CLEANUP_INTERVAL_SECONDS: int = 60

# Upload settings
MAX_UPLOAD_SIZE_MB: int = 50

# Expected columns for each sheet type
PURCHASE_COLUMNS: list[str] = [
    "Date", "TaxType", "No", "Branch", "RefNo", "PartyName", "GST_No",
    "ItemName", "PONO", "UOM", "Qty", "Rate", "Amount", "L Rate",
    "LAmount", "Status",
]

SALES_COLUMNS: list[str] = [
    "Invoice No", "Date", "PartyName", "GST_No", "SiteName", "HSNCode",
    "Item Type", "Grade", "Pump", "Qty", "Rate", "Include Tax Rate",
    "Amount", "Total Amount",
]

CONSUMPTION_COLUMNS: list[str] = [
    "Date", "Number", "BatchNo", "PartyName", "JobSite", "Grade", "Qty",
    "Cem", "FlyAsh", "GGBS", "Silica", "10mm", "20mm", "CSand", "CSand.1",
    "WTR1", "Admix1", "Admix 2",
]

# Mapping from Purchase ItemName -> Consumption column(s)
MATERIAL_MAPPING: dict[str, list[str]] = {
    "Cement": ["Cem"],
    "FLY ASH": ["FlyAsh"],
    "GGBS": ["GGBS"],
    "Silica": ["Silica"],
    "10 MM": ["10mm"],
    "20 MM": ["20mm"],
    "C.SAND": ["CSand", "CSand.1"],
    "Admixture HIPC": ["Admix1"],
    "Admixture MID": ["Admix 2"],
}

# All raw material columns in consumption
MATERIAL_COLUMNS: list[str] = [
    "Cem", "FlyAsh", "GGBS", "Silica", "10mm", "20mm",
    "CSand", "CSand.1", "WTR1", "Admix1", "Admix 2",
]

# PDF settings
PDF_PAGE_WIDTH: float = 595.27  # A4
PDF_PAGE_HEIGHT: float = 841.89
PDF_MARGIN: float = 40

# Direct Expenses columns
DIRECT_EXPENSE_COLUMNS: list[str] = [
    "Date", "Particulars", "Vch Type", "Narrations", "Vch No.",
    "Debit", "Credit", "Sub Group", "Expense Head", "Direct / Indirect Expense",
]

# Indirect Expenses columns
INDIRECT_EXPENSE_COLUMNS: list[str] = [
    "Date", "Particulars", "Vch Type", "Type", "Vch No.",
    "Debit", "Credit", "Sub Group", "Expense Head", "Direct / Indirect Expense", "Fixed",
]

# Other Income columns
OTHER_INCOME_COLUMNS: list[str] = [
    "Date", "Particulars", "Consignee/Party", "Consignee/Party Address", "Voucher Type",
    "Voucher No.", "Voucher Ref. No.", "Voucher Ref. Date", "GSTIN/UIN", "PAN No.",
    "Narration", "Gross Total", "Diesel & Petrol Expenses", "Discount Received",
]

# Income Statement row definitions
INCOME_STATEMENT_SECTIONS: list[dict] = [
    {"id": "revenue", "label": "Sales / Revenue", "type": "calculation", "source": "sales"},
    {"id": "opening_inventory", "label": "Revenue Opening Inventory", "type": "manual", "default": 0},
    {"id": "other_income", "label": "Other Income", "type": "manual", "default": 0},
    {"id": "total_income", "label": "Total Income", "type": "sum", "sources": ["revenue", "opening_inventory", "other_income"]},
    {"id": "purchases", "label": "Purchases", "type": "calculation", "source": "purchase"},
    {"id": "cogs", "label": "Cost of Goods Sold (COGS)", "type": "calculation", "source": "consumption"},
    {"id": "direct_expenses", "label": "Direct Expenses", "type": "calculation", "source": "direct_expenses"},
    {"id": "total_direct_expenses", "label": "Total Direct Expenses", "type": "sum", "sources": ["purchases", "cogs", "direct_expenses"]},
    {"id": "indirect_expenses", "label": "Indirect Expenses", "type": "calculation", "source": "indirect_expenses"},
    {"id": "total_expenses", "label": "Total Expenses", "type": "sum", "sources": ["total_direct_expenses", "indirect_expenses"]},
    {"id": "ebitda", "label": "EBITDA / PBITDA", "type": "difference", "sources": ["total_income", "total_expenses"]},
    {"id": "depreciation", "label": "Depreciation", "type": "auto_from_indirect", "expense_keywords": ["depreciation", "depn", "dep"]},
    {"id": "ebit", "label": "EBIT / PBIT", "type": "difference", "sources": ["ebitda", "depreciation"]},
    {"id": "interest", "label": "Interest Expense", "type": "auto_from_indirect", "expense_keywords": ["interest", "finance cost", "bank charges"]},
    {"id": "pbt", "label": "Profit Before Tax (PBT)", "type": "difference", "sources": ["ebit", "interest"]},
    {"id": "tax", "label": "Tax", "type": "calculated", "tax_rate": 0.25618},
    {"id": "pat", "label": "Profit After Tax (PAT)", "type": "difference", "sources": ["pbt", "tax"]},
]

# Keywords to identify Depreciation in Indirect Expenses
DEPRECIATION_KEYWORDS = ["depreciation", "depn", "dep", "amortization"]
# Keywords to identify Interest Expense in Indirect Expenses
INTEREST_KEYWORDS = ["interest", "finance cost", "bank charges", "loan interest", "interest on loan"]
