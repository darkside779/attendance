"""
Debug script to check face data in database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.employee import Employee
import json

def check_face_data():
    """Check what face data exists in database"""
    db = next(get_db())
    
    print("=== DEBUGGING FACE DATA ===")
    
    # Get all employees
    employees = db.query(Employee).all()
    print(f"\nTotal employees in database: {len(employees)}")
    
    for employee in employees:
        print(f"\n--- Employee: {employee.name} (ID: {employee.id}) ---")
        print(f"Employee ID: {employee.employee_id}")
        print(f"Face encoding exists: {bool(employee.face_encoding)}")
        
        if employee.face_encoding:
            try:
                face_data = json.loads(employee.face_encoding)
                print(f"Face encoding length: {len(face_data)}")
                print(f"Face encoding type: {type(face_data)}")
                print(f"First few values: {face_data[:5] if len(face_data) > 5 else face_data}")
            except json.JSONDecodeError as e:
                print(f"ERROR: Could not parse face encoding: {e}")
                print(f"Raw face encoding: {employee.face_encoding[:100]}...")
        else:
            print("No face encoding stored")
        
        print(f"Face image path: {employee.face_image_path}")
    
    # Check specifically for employees with face data
    employees_with_faces = db.query(Employee).filter(Employee.face_encoding.isnot(None)).all()
    print(f"\n=== SUMMARY ===")
    print(f"Employees with face data: {len(employees_with_faces)}")
    
    if employees_with_faces:
        print("Employees with face data:")
        for emp in employees_with_faces:
            print(f"  - {emp.name} ({emp.employee_id})")
    else:
        print("❌ NO EMPLOYEES WITH FACE DATA FOUND!")
        print("This explains why face recognition shows 'No employees with face data found'")
    
    db.close()

if __name__ == "__main__":
    check_face_data()
