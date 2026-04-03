# Krishvedi Farms config

from pathlib import Path

# Session settings
SESSION_EXPIRY_MINUTES: int = 30
SESSION_CLEANUP_INTERVAL_SECONDS: int = 60

# Upload settings
MAX_UPLOAD_SIZE_MB: int = 50

# Columns for single-sheet Krishvedi Farms format
KRISHVEDI_COLUMNS = [
    "Date", "Party", "Items", "Vch Type", "Vch No.",
    "Inwards_QTY", "Value", "Outwards_QTY", "Value_1",
    "Gross Value", "Consumption", "Gross Profit", "Perc %",
    "Closing_QTY", "Balance"
]

# Vch Type mappings
VCH_TYPE_MAPPING = {
    "Sales": "sale",
    "Credit Note": "sale",
    "Purchase": "purchase",
    "Debit Note": "purchase",
    "Stock Journal": "consumption",
    "Balance": "closing_balance",
    "Opening Balance": "opening_balance",
    "Opening Balances": "opening_balance",
    "Opening Balances ": "opening_balance",
}

# Column to use for each category
CATEGORY_COLUMN = {
    "sale": "Value_1",
    "purchase": "Value",
    "consumption": "Consumption",
    "closing_balance": "Balance",
    "opening_balance": "Balance",
}
