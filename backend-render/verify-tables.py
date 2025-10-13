#!/usr/bin/env python3
"""
Verify all database tables exist
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def verify_tables():
    """Verify all required tables exist"""
    required_tables = [
        'users', 'employees', 'attendance', 'shifts', 'payroll_records'
    ]
    
    print("🔍 Verifying database tables...")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            existing_tables = [row[0] for row in result]
            
            print(f"📊 Found tables: {existing_tables}")
            
            missing_tables = []
            for table in required_tables:
                if table in existing_tables:
                    print(f"✅ {table} - OK")
                else:
                    print(f"❌ {table} - MISSING")
                    missing_tables.append(table)
            
            if missing_tables:
                print(f"\n⚠️ Missing tables: {missing_tables}")
                print("🔧 Run 'python init_db.py' to create missing tables")
                return False
            else:
                print("\n🎉 All required tables exist!")
                return True
                
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

if __name__ == "__main__":
    verify_tables()
