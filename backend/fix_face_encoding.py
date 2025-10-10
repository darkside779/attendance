#!/usr/bin/env python3
"""
Script to fix the face_encoding column size issue
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_face_encoding_column():
    """Update the face_encoding column to LONGTEXT"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.begin() as connection:
            # Check current column type
            result = connection.execute(text("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'employees' 
                AND COLUMN_NAME = 'face_encoding'
            """))
            
            current_type = result.fetchone()
            if current_type:
                print(f"Current face_encoding column type: {current_type[0]}")
            
            # Update column to LONGTEXT
            print("Updating face_encoding column to LONGTEXT...")
            connection.execute(text("""
                ALTER TABLE employees 
                MODIFY COLUMN face_encoding LONGTEXT
            """))
            
            print("✅ Successfully updated face_encoding column to LONGTEXT")
            
            # Verify the change
            result = connection.execute(text("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'employees' 
                AND COLUMN_NAME = 'face_encoding'
            """))
            
            new_type = result.fetchone()
            if new_type:
                print(f"New face_encoding column type: {new_type[0]}")
                
    except Exception as e:
        print(f"❌ Error updating column: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🔧 Fixing face_encoding column size...")
    success = fix_face_encoding_column()
    
    if success:
        print("🎉 Database update completed successfully!")
        print("Now you need to re-register John Doe's face with the larger field size.")
    else:
        print("❌ Database update failed!")
