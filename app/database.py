import sqlite3
import os
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "data.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS report_data (
            id INTEGER PRIMARY KEY,
            filename TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_json TEXT
        );
    """)
    
    # Create default admin if not exists (change password here)
    cursor = conn.execute("SELECT COUNT(*) as count FROM admin")
    if cursor.fetchone()[0] == 0:
        conn.execute("INSERT INTO admin (username, password) VALUES (?, ?)", 
                     ("admin", "krishvedi123"))
    
    conn.commit()
    conn.close()

def get_admin():
    conn = get_db()
    row = conn.execute("SELECT * FROM admin LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None

def save_report(filename: str, data_json: str):
    conn = get_db()
    # Delete old report data
    conn.execute("DELETE FROM report_data")
    conn.execute("INSERT INTO report_data (filename, data_json) VALUES (?, ?)", 
                 (filename, data_json))
    conn.commit()
    conn.close()

def get_report():
    conn = get_db()
    row = conn.execute("SELECT * FROM report_data ORDER BY uploaded_at DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None