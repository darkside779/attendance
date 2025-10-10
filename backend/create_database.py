"""
Script to create the attendance database in MySQL
Run this after starting XAMPP MySQL service
"""
import pymysql
import sys

def create_database():
    try:
        # Connect to MySQL server (without specifying database)
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',  # Default XAMPP MySQL password is empty
            port=3306
        )
        
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS attendance_db")
        print("SUCCESS: Database 'attendance_db' created successfully!")
        
        # Show databases to confirm
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        print("\nAvailable databases:")
        for db in databases:
            print(f"  - {db[0]}")
            
        cursor.close()
        connection.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Error creating database: {e}")
        print("\nMake sure XAMPP MySQL service is running!")
        return False

if __name__ == "__main__":
    print("Creating attendance database...")
    success = create_database()
    
    if success:
        print("\nDatabase setup complete!")
        print("Next steps:")
        print("1. Update your .env file with correct database credentials")
        print("2. Run Alembic migrations to create tables")
    else:
        print("\nDatabase setup failed!")
        sys.exit(1)
