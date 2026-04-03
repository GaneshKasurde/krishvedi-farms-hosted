"""AI Insights service — anonymize data, call OpenAI API, de-anonymize response."""

from __future__ import annotations

import csv
import io
import logging
import os
from pathlib import Path

import openai
import pandas as pd

from app.services.anonymizer import Anonymizer, deanonymize_text

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def load_prompt(name: str = "insights") -> str:
    """Load a prompt template from the prompts/ directory."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def _df_to_csv_summary(df: pd.DataFrame, name: str, max_rows: int = 200) -> str:
    """Convert a DataFrame to a CSV string for the AI, truncated if large."""
    if df.empty:
        return f"[{name}: no data]\n"

    buf = io.StringIO()
    subset = df.head(max_rows)
    subset.to_csv(buf, index=False, quoting=csv.QUOTE_MINIMAL)

    header = f"### {name} ({len(df)} rows"
    if len(df) > max_rows:
        header += f", showing first {max_rows}"
    header += ")\n"

    return header + "```csv\n" + buf.getvalue() + "```\n\n"


def generate_insights(
    purchase_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    consumption_df: pd.DataFrame,
    prompt_name: str = "insights",
    model: str = "gpt-4o",
) -> dict:
    """Full pipeline: anonymize → build prompt → call OpenAI → de-anonymize.

    Returns:
        {
            "raw_response": str,       # anonymized AI response (markdown)
            "deanonymized": str,       # de-anonymized response with real data
            "anonymization_meta": dict,
            "model_used": str,
            "prompt_used": str,
        }
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY environment variable not set. "
            "Set it in backend/.env or export it in your shell."
        )

    # Step 1: Anonymize
    anon = Anonymizer()
    anon_purchase = anon.anonymize_purchase(purchase_df.copy())
    anon_sales = anon.anonymize_sales(sales_df.copy())
    anon_consumption = anon.anonymize_consumption(consumption_df.copy())
    reverse_mappings = anon.get_reverse_mappings()
    meta = anon.get_metadata()

    # Step 2: Build prompt with anonymized data
    system_prompt = load_prompt(prompt_name)

    data_section = "## Anonymized Data\n\n"
    data_section += _df_to_csv_summary(anon_purchase, "Purchase Data")
    data_section += _df_to_csv_summary(anon_sales, "Sales Data")
    data_section += _df_to_csv_summary(anon_consumption, "Consumption Data", max_rows=300)

    user_message = data_section + "\nPlease analyze this data and provide insights as described in your instructions."

    # Step 3: Call OpenAI API
    logger.info("Calling OpenAI API (model=%s) with %d chars of data", model, len(user_message))

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        max_tokens=8192,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )

    raw_response = response.choices[0].message.content
    logger.info("OpenAI response: %d chars", len(raw_response))

    # Step 4: De-anonymize
    deanonymized = deanonymize_text(raw_response, reverse_mappings)

    return {
        "raw_response": raw_response,
        "deanonymized": deanonymized,
        "anonymization_meta": meta,
        "model_used": model,
        "prompt_used": prompt_name,
    }
