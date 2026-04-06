from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlalchemy.orm import Session
from database import get_db
import models, auth
from auth import require_admin
import pandas as pd, json, io, re
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

class CompanyCreate(BaseModel):
    name: str
    username: str
    password: str

def make_slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

@router.get("/companies")
def list_companies(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    companies = db.query(models.Company).all()
    result = []
    for c in companies:
        users = db.query(models.User).filter(models.User.company_id == c.id).all()
        latest_data = db.query(models.CompanyData).filter(models.CompanyData.company_id == c.id).order_by(models.CompanyData.uploaded_at.desc()).first()
        result.append({
            "id": c.id, "name": c.name, "slug": c.slug,
            "created_at": c.created_at.isoformat(),
            "client_count": len(users),
            "has_data": latest_data is not None,
            "last_upload": latest_data.uploaded_at.isoformat() if latest_data else None,
            "users": [{"id": u.id, "username": u.username} for u in users]
        })
    return result

@router.post("/companies")
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    name = payload.name.strip()
    username = payload.username.strip()
    password = payload.password.strip()
    if not name or not username or not password:
        raise HTTPException(status_code=400, detail="Name, username and password are required")
    
    slug = make_slug(name)
    existing = db.query(models.Company).filter(models.Company.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company with this name already exists")
    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    company = models.Company(name=name, slug=slug)
    db.add(company)
    db.flush()
    
    user = models.User(
        username=username,
        password_hash=auth.hash_password(password),
        role="client",
        company_id=company.id
    )
    db.add(user)
    db.commit()
    db.refresh(company)
    return {"id": company.id, "name": company.name, "slug": company.slug, "username": username, "message": "Company created successfully"}

@router.delete("/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.query(models.User).filter(models.User.company_id == company_id).delete()
    db.query(models.CompanyData).filter(models.CompanyData.company_id == company_id).delete()
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}

@router.post("/companies/{company_id}/upload")
async def upload_company_data(company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    df.columns = df.columns.str.strip()
    
    column_map = {
        'Date': 'Date', 'Party': 'Party', 'Items': 'Items',
        'Vch Type': 'Vch_Type', 'Vch No.': 'Vch_No',
        'Inwards_QTY': 'Inwards_QTY', 'Value': 'Value',
        'Outwards_QTY': 'Outwards_QTY', 'Value_1': 'Value_1',
        'Gross Value': 'Gross_Value', 'Consumption': 'Consumption',
        'Gross Profit': 'Gross_Profit', 'Perc %': 'Perc',
        'Closing_QTY': 'Closing_QTY', 'Balance': 'Balance'
    }
    df.rename(columns=column_map, inplace=True)
    
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df['Month'] = df['Date'].dt.strftime('%b %Y')
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    
    def categorize(vch_type):
        if pd.isna(vch_type): return 'other'
        v = str(vch_type).lower().strip()
        if v == 'sales': return 'sale'
        if v == 'credit note': return 'sale'
        if v == 'purchase': return 'purchase'
        if v == 'debit note': return 'debit_note'
        if v == 'stock journal': return 'consumption'
        if v == 'opening balance': return 'opening_balance'
        if v == 'balance': return 'closing_balance'
        return 'other'
    
    if 'Vch_Type' in df.columns:
        df['category'] = df['Vch_Type'].apply(categorize)
    
    # Calculate amounts based on category
    def get_amount(row):
        cat = row.get('category', '')
        if cat == 'purchase':
            val = row.get('Value')
            if val and str(val) not in ['', 'nan', 'None']:
                return float(val)
            return 0
        elif cat == 'debit_note':
            val = row.get('Value')
            if val and str(val) not in ['', 'nan', 'None']:
                return float(val)
            return 0
        elif cat == 'sale':
            val = row.get('Value_1')
            if val and str(val) not in ['', 'nan', 'None']:
                return float(val)
            return 0
        elif cat == 'opening_balance' or cat == 'closing_balance':
            val = row.get('Balance')
            if val and str(val) not in ['', 'nan', 'None']:
                return float(val)
            return 0
        return 0
    
    df['Amount'] = df.apply(get_amount, axis=1)
    
    # Make sure key columns exist with standardized names
    for col in ['Gross_Value', 'Gross_Profit', 'Value', 'Value_1']:
        if col not in df.columns:
            df[col] = None
    for col in ['Outwards_QTY', 'Inwards_QTY']:
        if col not in df.columns:
            df[col] = None
    
    # Convert all columns to string for JSON serialization
    df = df.astype(str)
    df = df.replace('nan', None)
    df = df.replace('None', None)
    df = df.where(df.notna(), None)
    json_data = df.to_json(orient='records', force_ascii=False)
    
    existing = db.query(models.CompanyData).filter(models.CompanyData.company_id == company_id).first()
    if existing:
        existing.json_data = json_data
        existing.uploaded_at = datetime.utcnow()
        existing.uploaded_by = current_user["username"]
    else:
        new_data = models.CompanyData(company_id=company_id, json_data=json_data, uploaded_by=current_user["username"])
        db.add(new_data)
    db.commit()
    return {"message": f"Data uploaded successfully for {company.name}", "rows": len(df)}

@router.put("/companies/{company_id}/credentials")
def update_credentials(company_id: int, payload: dict, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found for this company")
    if payload.get("password"):
        user.password_hash = auth.hash_password(payload["password"])
    if payload.get("username"):
        user.username = payload["username"]
    db.commit()
    return {"message": "Credentials updated"}