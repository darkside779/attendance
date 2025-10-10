#!/usr/bin/env python3
"""
Script to clear corrupted face encoding data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def clear_corrupted_face_data():
    """Clear all face encoding data so we can re-register properly"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.begin() as connection:
            # Check current face data
            result = connection.execute(text("""
                SELECT id, name, 
                       CASE WHEN face_encoding IS NOT NULL THEN LENGTH(face_encoding) ELSE 0 END as encoding_length
                FROM employees 
                WHERE face_encoding IS NOT NULL
            """))
            
            employees_with_faces = result.fetchall()
            print("Current employees with face data:")
            for emp in employees_with_faces:
                print(f"  - Employee {emp[0]} ({emp[1]}): {emp[2]} characters")
            
            # Clear all face encoding data
            print("\nClearing all face encoding data...")
            result = connection.execute(text("""
                UPDATE employees 
                SET face_encoding = NULL, face_image_path = NULL 
                WHERE face_encoding IS NOT NULL
            """))
            
            affected_rows = result.rowcount
            print(f"✅ Cleared face data for {affected_rows} employees")
            
            # Verify the clearing
            result = connection.execute(text("""
                SELECT COUNT(*) FROM employees WHERE face_encoding IS NOT NULL
            """))
            
            remaining_count = result.fetchone()[0]
            print(f"Remaining employees with face data: {remaining_count}")
                
    except Exception as e:
        print(f"❌ Error clearing face data: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧹 Clearing corrupted face encoding data...")
    success = clear_corrupted_face_data()
    
    if success:
        print("🎉 Face data cleared successfully!")
        print("Now you can re-register faces with the fixed database field.")
    else:
        print("❌ Failed to clear face data!")
