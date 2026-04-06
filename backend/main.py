from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routes import auth_routes, admin_routes, dashboard_routes
import os
from dotenv import load_dotenv
load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Krishvedi Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)
app.include_router(dashboard_routes.router)

@app.get("/")
def root():
    return {"message": "Krishvedi Portal API is running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}