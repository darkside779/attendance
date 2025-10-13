#!/usr/bin/env python3
"""
Test database connection for Render deployment
"""
import os
import sys

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import engine, DATABASE_URL
from sqlalchemy import text

def test_database_connection():
    """Test if database connection works"""
    print(f"🔗 Testing database connection...")
    print(f"📍 Database URL: {DATABASE_URL.split('://')[0]}://...")
    
    try:
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    # Test with different DATABASE_URL scenarios
    print("🧪 Testing database configurations...\n")
    
    # Test 1: Normal case
    print("Test 1: Normal SQLite")
    test_database_connection()
    
    # Test 2: Simulate malformed HTTP URL (like Render issue)
    print("\nTest 2: Simulating HTTP URL (Render issue)")
    original_url = os.environ.get("DATABASE_URL", "")
    os.environ["DATABASE_URL"] = "https://some-malformed-url.com/database"
    
    # Reload the database module to test the fix
    import importlib
    from app.core import database
    importlib.reload(database)
    
    # Restore original URL
    if original_url:
        os.environ["DATABASE_URL"] = original_url
    else:
        os.environ.pop("DATABASE_URL", None)
    
    print("\n🎉 Database configuration tests completed!")
