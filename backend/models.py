from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="company")
    data_records = relationship("CompanyData", back_populates="company")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="client")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company", back_populates="users")

class CompanyData(Base):
    __tablename__ = "company_data"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    json_data = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String)
    company = relationship("Company", back_populates="data_records")