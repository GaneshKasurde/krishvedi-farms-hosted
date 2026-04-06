from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, json
from typing import Optional

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def get_company_data(db: Session, current_user: dict):
    if current_user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admin must specify company_id")
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated with this account")
    
    data_record = db.query(models.CompanyData).filter(
        models.CompanyData.company_id == company_id
    ).order_by(models.CompanyData.uploaded_at.desc()).first()
    
    if not data_record:
        raise HTTPException(status_code=404, detail="No data uploaded yet. Please contact admin.")
    
    return json.loads(data_record.json_data)

def get_admin_company_data(db: Session, company_id: int):
    data_record = db.query(models.CompanyData).filter(
        models.CompanyData.company_id == company_id
    ).order_by(models.CompanyData.uploaded_at.desc()).first()
    if not data_record:
        raise HTTPException(status_code=404, detail="No data for this company")
    return json.loads(data_record.json_data)

def filter_by_month(records, month):
    if not month or month == "All":
        return records
    return [r for r in records if r.get("Month") == month]

def safe_float(val):
    try:
        if val is None: return 0.0
        if isinstance(val, (int, float)): return float(val)
        val_str = str(val).strip()
        if val_str == '' or val_str.lower() in ['none', 'nan']: return 0.0
        return float(val_str)
    except:
        return 0.0

def get_sales_amount(row):
    val = row.get('Value_1')
    if val is None or val == '' or str(val).lower() == 'nan':
        val = row.get('Gross_Value')
    return safe_float(val)  # Keep as is from Excel

def get_purchase_amount(row):
    val = row.get('Value')
    if val is None or val == '' or str(val).lower() == 'nan':
        val = row.get('Value_1')
    return safe_float(val)  # Keep as-is from Excel (no abs)

def get_opening_balance(row):
    val = row.get('Balance')
    return safe_float(val)

def get_closing_balance(row):
    val = row.get('Balance')
    return safe_float(val)

@router.get("/overview")
def get_overview(month: Optional[str] = Query(None), company_id: Optional[int] = Query(None),
                 db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin" and company_id:
        records = get_admin_company_data(db, company_id)
    else:
        records = get_company_data(db, current_user)
    
    filtered = filter_by_month(records, month)
    
    # Sales = Sales + Credit Note
    sales_records = [r for r in filtered if r.get("category") in ["sale", "credit_note"]]
    total_sales = sum(get_sales_amount(r) for r in sales_records)
    
    # Purchase = Purchase + Debit Note  
    purchase_records = [r for r in filtered if r.get("category") in ["purchase", "debit_note"]]
    total_purchase = sum(get_purchase_amount(r) for r in purchase_records)
    
    # Opening and Closing Balance
    opening = sum(get_opening_balance(r) for r in filtered if r.get("category") == "opening_balance")
    closing = sum(get_closing_balance(r) for r in filtered if r.get("category") == "closing_balance")
    
    # Gross Profit = Sales + Closing - Purchase - Opening
    total_gp = total_sales + closing - total_purchase - opening
    
    months = sorted(list(set(r.get("Month") for r in records if r.get("Month"))), key=lambda x: x if x else "")
    
    monthly_sales = {}
    for r in records:
        if r.get("category") in ["sale", "credit_note"]:
            m = r.get("Month", "Unknown")
            monthly_sales[m] = monthly_sales.get(m, 0) + get_sales_amount(r)
    
    monthly_purchase = {}
    for r in records:
        if r.get("category") in ["purchase", "debit_note"]:
            m = r.get("Month", "Unknown")
            monthly_purchase[m] = monthly_purchase.get(m, 0) + get_purchase_amount(r)
    
    return {
        "total_sales": round(total_sales, 2),
        "total_purchase": round(total_purchase, 2),
        "total_gross_profit": round(total_gp, 2),
        "gp_percentage": round((total_gp / total_sales * 100) if total_sales > 0 else 0, 2),
        "months": ["All"] + months,
        "monthly_sales": [{"month": k, "sales": round(v, 2)} for k, v in monthly_sales.items()],
        "monthly_purchase": [{"month": k, "purchase": round(v, 2)} for k, v in monthly_purchase.items()]
    }

@router.get("/items")
def get_items(month: Optional[str] = Query(None), company_id: Optional[int] = Query(None),
              db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin" and company_id:
        records = get_admin_company_data(db, company_id)
    else:
        records = get_company_data(db, current_user)
    
    filtered = filter_by_month(records, month)
    items_data = {}
    for r in filtered:
        item = r.get("Items", "Unknown")
        if not item: continue
        if item not in items_data:
            items_data[item] = {"item": item, "sales": 0, "purchase": 0, "gross_profit": 0, "quantity": 0, "opening": 0, "closing": 0}
        cat = r.get("category")
        if cat in ["sale", "credit_note"]:
            items_data[item]["sales"] += get_sales_amount(r)
            items_data[item]["quantity"] += safe_float(r.get("Outwards_QTY"))
        elif cat in ["purchase", "debit_note"]:
            items_data[item]["purchase"] += get_purchase_amount(r)
        elif cat == "opening_balance":
            items_data[item]["opening"] += safe_float(r.get("Balance"))
        elif cat == "closing_balance":
            items_data[item]["closing"] += safe_float(r.get("Balance"))
    
    # GP = Sales + Closing - Purchase - Opening
    for item in items_data.values():
        item["gross_profit"] = item["sales"] + item["closing"] - item["purchase"] - item["opening"]
    
    result = [{"item": v["item"], "sales": round(v["sales"], 2), "purchase": round(v["purchase"], 2),
               "gross_profit": round(v["gross_profit"], 2), "quantity": round(v["quantity"], 2)} for v in items_data.values()]
    return sorted(result, key=lambda x: x["sales"], reverse=True)

@router.get("/parties")
def get_parties(month: Optional[str] = Query(None), company_id: Optional[int] = Query(None),
                db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin" and company_id:
        records = get_admin_company_data(db, company_id)
    else:
        records = get_company_data(db, current_user)
    
    filtered = filter_by_month(records, month)
    parties_data = {}
    for r in filtered:
        party = r.get("Party", "Unknown")
        if not party: continue
        if party not in parties_data:
            parties_data[party] = {"party": party, "sales": 0, "purchase": 0, "gross_profit": 0, "opening": 0, "closing": 0}
        cat = r.get("category")
        if cat in ["sale", "credit_note"]:
            parties_data[party]["sales"] += get_sales_amount(r)
        elif cat in ["purchase", "debit_note"]:
            parties_data[party]["purchase"] += get_purchase_amount(r)
        elif cat == "opening_balance":
            parties_data[party]["opening"] += safe_float(r.get("Balance"))
        elif cat == "closing_balance":
            parties_data[party]["closing"] += safe_float(r.get("Balance"))
    
    # GP = Sales + Closing - Purchase - Opening
    for party in parties_data.values():
        party["gross_profit"] = party["sales"] + party["closing"] - party["purchase"] - party["opening"]
    
    result = [{"party": v["party"], "sales": round(v["sales"], 2), "purchase": round(v["purchase"], 2),
               "gross_profit": round(v["gross_profit"], 2)} for v in parties_data.values()]
    return sorted(result, key=lambda x: x["sales"], reverse=True)

@router.get("/income-statement")
def get_income(month: Optional[str] = Query(None), company_id: Optional[int] = Query(None),
               db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin" and company_id:
        records = get_admin_company_data(db, company_id)
    else:
        records = get_company_data(db, current_user)
    
    filtered = filter_by_month(records, month)
    opening = sum(get_opening_balance(r) for r in filtered if r.get("category") == "opening_balance")
    closing = sum(get_closing_balance(r) for r in filtered if r.get("category") == "closing_balance")
    sales = sum(get_sales_amount(r) for r in filtered if r.get("category") in ["sale", "credit_note"])
    purchase = sum(get_purchase_amount(r) for r in filtered if r.get("category") in ["purchase", "debit_note"])
    consumption = sum(get_purchase_amount(r) for r in filtered if r.get("category") == "consumption")
    gross_profit = sales + closing - purchase - opening
    
    return {
        "opening_balance": round(opening, 2), "purchases": round(purchase, 2),
        "sales": round(sales, 2), "closing_balance": round(closing, 2),
        "consumption": round(consumption, 2), "gross_profit": round(gross_profit, 2),
        "gross_profit_percentage": round((gross_profit / sales * 100) if sales > 0 else 0, 2)
    }

@router.get("/debug-data")
def debug_data(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    records = get_company_data(db, current_user)
    return {
        "total_records": len(records),
        "categories": list(set(r.get("category") for r in records if r.get("category"))),
        "sample_records": records[:5] if records else []
    }