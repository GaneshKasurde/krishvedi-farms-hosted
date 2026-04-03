"""AI Insights endpoints."""

from __future__ import annotations

import logging
import traceback
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.session import store
from app.services.ai_insights import generate_insights, load_prompt, PROMPTS_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights")


@router.post("/generate")
async def generate(
    session_id: str = Query(...),
    body: dict = Body(default={}),
) -> JSONResponse:
    """Generate AI insights from uploaded data.

    Pipeline: anonymize data → send to Claude API → de-anonymize response.

    Body (optional):
        { "prompt": "insights", "model": "claude-sonnet-4-20250514" }
    """
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if not session.months:
        raise HTTPException(status_code=400, detail="No data uploaded. Upload files first.")

    prompt_name = body.get("prompt", "insights")
    model = body.get("model", "gpt-4o")

    # Collect all raw data across months
    purchase_frames = []
    sales_frames = []
    consumption_frames = []

    for md in session.months.values():
        if not md.purchase_raw.empty:
            purchase_frames.append(md.purchase_raw)
        if not md.sales_raw.empty:
            sales_frames.append(md.sales_raw)
        if not md.consumption_raw.empty:
            consumption_frames.append(md.consumption_raw)

    purchase_df = pd.concat(purchase_frames, ignore_index=True) if purchase_frames else pd.DataFrame()
    sales_df = pd.concat(sales_frames, ignore_index=True) if sales_frames else pd.DataFrame()
    consumption_df = pd.concat(consumption_frames, ignore_index=True) if consumption_frames else pd.DataFrame()

    try:
        result = generate_insights(
            purchase_df, sales_df, consumption_df,
            prompt_name=prompt_name,
            model=model,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("AI insights generation failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI API error: {str(e)}")

    # Store reverse mappings for manual de-anonymize if needed
    session.anon_mappings = result.get("anonymization_meta")

    return JSONResponse({
        "deanonymized": result["deanonymized"],
        "raw_response": result["raw_response"],
        "model_used": result["model_used"],
        "prompt_used": result["prompt_used"],
        "anonymization_meta": result["anonymization_meta"],
    })


@router.get("/prompts")
async def list_prompts() -> JSONResponse:
    """List available prompt templates."""
    prompts = []
    if PROMPTS_DIR.exists():
        for f in sorted(PROMPTS_DIR.glob("*.md")):
            content = f.read_text(encoding="utf-8")
            # Extract first heading as title
            title = f.stem
            for line in content.split("\n"):
                if line.startswith("# "):
                    title = line[2:].strip()
                    break
            prompts.append({
                "name": f.stem,
                "title": title,
                "file": f.name,
            })
    return JSONResponse({"prompts": prompts})


@router.get("/prompts/{name}")
async def get_prompt(name: str) -> JSONResponse:
    """Get the content of a prompt template."""
    try:
        content = load_prompt(name)
        return JSONResponse({"name": name, "content": content})
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Prompt '{name}' not found")
