from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, auth, os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin@krishvedi123")
    
    if form_data.username == ADMIN_USERNAME and form_data.password == ADMIN_PASSWORD:
        token = auth.create_access_token({"sub": form_data.username, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin", "username": form_data.username}
    
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    token = auth.create_access_token({"sub": user.username, "role": user.role, "company_id": user.company_id})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "username": user.username, "company_id": user.company_id}

@router.get("/me")
def get_me(current_user: dict = Depends(auth.get_current_user)):
    return current_user