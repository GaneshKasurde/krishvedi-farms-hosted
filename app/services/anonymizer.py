"""Data anonymization service.

Strips identifying information while preserving analytical value.
- Replaces party names, GST numbers, site names, invoice numbers with pseudonyms
- Scales financial values and volumes by a consistent random factor
- Shifts dates by a random offset
- Keeps grades, material names, UOM, transaction types (not identifying)
"""

from __future__ import annotations

import hashlib
import random
from datetime import timedelta
from io import BytesIO

import pandas as pd


class Anonymizer:
    """Stateful anonymizer that maintains consistent mappings across sheets."""

    def __init__(self, seed: int | None = None):
        self._rng = random.Random(seed or random.randint(1, 999999))

        # Consistent pseudonym mappings
        self._customer_map: dict[str, str] = {}
        self._supplier_map: dict[str, str] = {}
        self._site_map: dict[str, str] = {}

        # Random scale factor between 0.75 and 1.25 (consistent across all sheets)
        self.scale_factor = round(self._rng.uniform(0.75, 1.25), 4)

        # Random date shift between -180 and +180 days
        self.date_shift = timedelta(days=self._rng.randint(-180, 180))

        # Counters
        self._customer_counter = 0
        self._supplier_counter = 0
        self._site_counter = 0

    def _get_customer(self, name: str) -> str:
        key = str(name).strip().upper()
        if key in ("", "NAN", "NONE"):
            return ""
        if key not in self._customer_map:
            self._customer_counter += 1
            self._customer_map[key] = f"Customer_{self._customer_counter:03d}"
        return self._customer_map[key]

    def _get_supplier(self, name: str) -> str:
        key = str(name).strip().upper()
        if key in ("", "NAN", "NONE"):
            return ""
        if key not in self._supplier_map:
            self._supplier_counter += 1
            self._supplier_map[key] = f"Supplier_{self._supplier_counter:03d}"
        return self._supplier_map[key]

    def _get_site(self, name: str) -> str:
        key = str(name).strip().upper()
        if key in ("", "NAN", "NONE"):
            return ""
        if key not in self._site_map:
            self._site_counter += 1
            self._site_map[key] = f"Site_{self._site_counter:03d}"
        return self._site_map[key]

    def _shift_date(self, dt):
        if pd.isna(dt):
            return dt
        try:
            return dt + self.date_shift
        except Exception:
            return dt

    def _scale(self, val):
        if pd.isna(val):
            return val
        try:
            return round(float(val) * self.scale_factor, 2)
        except (ValueError, TypeError):
            return val

    def _hash_ref(self, prefix: str, val) -> str:
        if pd.isna(val) or str(val).strip() in ("", "nan", "None"):
            return ""
        short = hashlib.md5(str(val).encode()).hexdigest()[:6].upper()
        return f"{prefix}_{short}"

    def anonymize_purchase(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()

        # Dates
        if "Date" in out.columns:
            out["Date"] = out["Date"].apply(self._shift_date)

        # Identifiers
        if "PartyName" in out.columns:
            out["PartyName"] = out["PartyName"].apply(self._get_supplier)
        if "GST_No" in out.columns:
            out["GST_No"] = "REMOVED"
        if "No" in out.columns:
            out["No"] = [f"PUR_{i+1:04d}" for i in range(len(out))]
        if "RefNo" in out.columns:
            out["RefNo"] = out["RefNo"].apply(lambda v: self._hash_ref("REF", v))
        if "Branch" in out.columns:
            branch_map = {}
            counter = 0
            for b in out["Branch"].unique():
                bs = str(b).strip()
                if bs in ("", "-", "nan"):
                    branch_map[b] = "-"
                else:
                    counter += 1
                    branch_map[b] = f"Plant_{chr(64 + counter)}"
            out["Branch"] = out["Branch"].map(branch_map)
        if "PONO" in out.columns:
            out["PONO"] = out["PONO"].apply(lambda v: self._hash_ref("PO", v))

        # Financial values — scale
        for col in ["Qty", "Rate", "Amount", "L Rate", "LAmount"]:
            if col in out.columns:
                out[col] = out[col].apply(self._scale)

        # Keep: ItemName, UOM, TaxType, Status (not identifying)
        return out

    def anonymize_sales(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()

        # Dates
        if "Date" in out.columns:
            out["Date"] = out["Date"].apply(self._shift_date)

        # Identifiers
        if "Invoice No" in out.columns:
            out["Invoice No"] = [f"INV_{i+1:04d}" for i in range(len(out))]
        if "PartyName" in out.columns:
            out["PartyName"] = out["PartyName"].apply(self._get_customer)
        if "GST_No" in out.columns:
            out["GST_No"] = "REMOVED"
        if "SiteName" in out.columns:
            out["SiteName"] = out["SiteName"].apply(self._get_site)
        if "HSNCode" in out.columns:
            out["HSNCode"] = "REMOVED"

        # Financial values — scale
        for col in ["Qty", "Rate", "Include Tax Rate", "Amount", "Total Amount"]:
            if col in out.columns:
                out[col] = out[col].apply(self._scale)

        # Keep: Item Type, Grade, Pump (not identifying)
        return out

    def anonymize_consumption(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()

        # Dates — parse first if they're strings (e.g., "02 Jan 2026")
        if "Date" in out.columns:
            out["Date"] = pd.to_datetime(out["Date"], errors="coerce", dayfirst=True)
            out["Date"] = out["Date"].apply(self._shift_date)

        # Identifiers
        if "Number" in out.columns:
            out["Number"] = [f"BATCH_{i+1:04d}" for i in range(len(out))]
        if "BatchNo" in out.columns:
            out["BatchNo"] = [f"B{i+1:05d}" for i in range(len(out))]
        if "PartyName" in out.columns:
            out["PartyName"] = out["PartyName"].apply(self._get_customer)
        if "JobSite" in out.columns:
            out["JobSite"] = out["JobSite"].apply(self._get_site)

        # Scale volumes and material quantities
        scale_cols = ["Qty", "Cem", "FlyAsh", "GGBS", "Silica", "10mm", "20mm",
                      "CSand", "CSand.1", "WTR1", "Admix1", "Admix 2"]
        for col in scale_cols:
            if col in out.columns:
                out[col] = out[col].apply(self._scale)

        # Keep: Grade (not identifying)
        return out

    def get_metadata(self) -> dict:
        """Return anonymization metadata (for the user's reference only, not shared)."""
        return {
            "scale_factor": self.scale_factor,
            "date_shift_days": self.date_shift.days,
            "customers_mapped": len(self._customer_map),
            "suppliers_mapped": len(self._supplier_map),
            "sites_mapped": len(self._site_map),
        }

    def get_reverse_mappings(self) -> dict:
        """Return all mappings needed to de-anonymize AI responses.

        This is stored in the session — never shared externally.
        """
        # Reverse: pseudonym -> real name
        reverse_customers = {v: k for k, v in self._customer_map.items()}
        reverse_suppliers = {v: k for k, v in self._supplier_map.items()}
        reverse_sites = {v: k for k, v in self._site_map.items()}

        # Combine all name mappings (pseudonym -> real)
        all_names = {}
        all_names.update(reverse_customers)
        all_names.update(reverse_suppliers)
        all_names.update(reverse_sites)

        return {
            "name_map": all_names,           # "Customer_001" -> "TRIDENT RMC"
            "scale_factor": self.scale_factor,
            "date_shift_days": self.date_shift.days,
        }


def anonymize_and_export(
    purchase_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    consumption_df: pd.DataFrame,
    seed: int | None = None,
) -> tuple[bytes, dict, dict]:
    """Anonymize all 3 DataFrames and return as an Excel workbook (bytes).

    Returns:
        (excel_bytes, metadata_dict, reverse_mappings_dict)
    """
    anon = Anonymizer(seed=seed)

    anon_purchase = anon.anonymize_purchase(purchase_df)
    anon_sales = anon.anonymize_sales(sales_df)
    anon_consumption = anon.anonymize_consumption(consumption_df)

    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        anon_purchase.to_excel(writer, sheet_name="Purchase", index=False)
        anon_sales.to_excel(writer, sheet_name="Sales", index=False)
        anon_consumption.to_excel(writer, sheet_name="Consumption", index=False)

    return buf.getvalue(), anon.get_metadata(), anon.get_reverse_mappings()


def deanonymize_text(text: str, reverse_mappings: dict) -> str:
    """Replace anonymized references in AI response text with real values.

    Handles:
    1. Name replacements (Customer_001 -> real name, Site_003 -> real site)
    2. Scaled numbers (detect currency patterns and reverse scale)
    3. Shifted dates (detect date patterns and reverse shift)
    """
    import re
    from datetime import datetime

    result = text
    name_map = reverse_mappings.get("name_map", {})
    scale_factor = reverse_mappings.get("scale_factor", 1.0)
    date_shift_days = reverse_mappings.get("date_shift_days", 0)
    reverse_shift = timedelta(days=-date_shift_days)

    # --- Step 1: Replace pseudonyms (longest first to avoid partial matches) ---
    sorted_pseudonyms = sorted(name_map.keys(), key=len, reverse=True)
    for pseudonym in sorted_pseudonyms:
        real_name = name_map[pseudonym]
        # Title-case the real name for readability
        display_name = real_name.title() if real_name.isupper() else real_name
        result = result.replace(pseudonym, display_name)

    # --- Step 2: Reverse-scale currency amounts ---
    # Match patterns like: Rs 1,234 | Rs 12,34,567 | ₹1,234.56 | 1,234.56 Cr | 1.23 L
    currency_pattern = re.compile(
        r'(?:Rs\.?\s*|₹\s*)'                    # Currency prefix
        r'(-?[\d,]+(?:\.\d{1,2})?)'              # Number with optional decimals
        r'(?:\s*(?:Cr|Lakh|L|K|crore|lakh))?'    # Optional suffix
        r'|'
        r'(-?[\d,]+(?:\.\d{1,2})?)'              # Number
        r'\s*(?:Cr|Lakh|L|crore|lakh)'           # Required suffix
    )

    def reverse_scale_match(m):
        full = m.group(0)
        num_str = m.group(1) or m.group(2)
        if num_str is None:
            return full
        try:
            num_val = float(num_str.replace(",", ""))
            real_val = num_val / scale_factor
            # Format with Indian commas
            formatted = _format_indian(real_val)
            return full.replace(num_str, formatted)
        except ValueError:
            return full

    result = currency_pattern.sub(reverse_scale_match, result)

    # --- Step 3: Reverse-shift dates ---
    # Match common date formats: "Jul 2025", "2025-07", "July 2025", "18 Jul 2025", "2025-07-18"
    date_patterns = [
        # YYYY-MM-DD
        (re.compile(r'\b(\d{4})-(\d{2})-(\d{2})\b'), "%Y-%m-%d"),
        # YYYY-MM
        (re.compile(r'\b(\d{4})-(\d{2})\b(?!-\d)'), "%Y-%m"),
        # DD Mon YYYY (e.g., 18 Jul 2025)
        (re.compile(r'\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b'), "%d %b %Y"),
        # Mon YYYY (e.g., Jul 2025)
        (re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b'), "%b %Y"),
        # Month YYYY (e.g., July 2025)
        (re.compile(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b'), "%B %Y"),
    ]

    for pattern, fmt in date_patterns:
        def make_replacer(date_fmt):
            def replace_date(m):
                try:
                    dt = datetime.strptime(m.group(0), date_fmt)
                    real_dt = dt + reverse_shift
                    return real_dt.strftime(date_fmt)
                except ValueError:
                    return m.group(0)
            return replace_date
        result = pattern.sub(make_replacer(fmt), result)

    return result


def _format_indian(val: float) -> str:
    """Format number with Indian comma grouping (1,23,456.78)."""
    if val < 0:
        return "-" + _format_indian(-val)
    int_part = int(round(val, 2))
    dec_part = round(val - int_part, 2)

    s = str(int_part)
    if len(s) <= 3:
        result = s
    else:
        result = s[-3:]
        s = s[:-3]
        while s:
            result = s[-2:] + "," + result
            s = s[:-2]

    if dec_part > 0:
        result += f".{int(round(dec_part * 100)):02d}"

    return result
