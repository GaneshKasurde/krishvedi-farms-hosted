from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.database import get_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str | None = None

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    admin = get_admin()
    
    if not admin:
        return LoginResponse(success=False, message="No admin configured")
    
    if request.username == admin["username"] and request.password == admin["password"]:
        # Simple token (in production, use proper JWT)
        token = f"session_{admin['username']}_{admin['id']}"
        return LoginResponse(success=True, message="Login successful", token=token)
    
    return LoginResponse(success=False, message="Invalid credentials")

@router.get("/check")
def check_auth(token: str = None):
    if token and token.startswith("session_"):
        return {"authenticated": True}
    return {"authenticated": False}
