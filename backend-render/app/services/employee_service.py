"""
Employee service for database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

class EmployeeService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_employee_by_id(self, employee_id: int) -> Optional[Employee]:
        """Get employee by ID"""
        return self.db.query(Employee).filter(Employee.id == employee_id).first()
    
    def get_employee_by_employee_id(self, employee_id: str) -> Optional[Employee]:
        """Get employee by employee ID"""
        return self.db.query(Employee).filter(Employee.employee_id == employee_id).first()
    
    def create_employee(self, employee: EmployeeCreate, created_by: int) -> Employee:
        """Create a new employee"""
        db_employee = Employee(
            employee_id=employee.employee_id,
            name=employee.name,
            phone=employee.phone,
            email=employee.email,
            department=employee.department,
            position=employee.position,
            hire_date=employee.hire_date,
            salary_rate=employee.salary_rate or 0,
            is_active=True,
            created_by=created_by
        )
        self.db.add(db_employee)
        self.db.commit()
        self.db.refresh(db_employee)
        return db_employee
    
    def update_employee(self, employee_id: int, employee_update: EmployeeUpdate) -> Optional[Employee]:
        """Update employee information"""
        db_employee = self.get_employee_by_id(employee_id)
        if not db_employee:
            return None
        
        update_data = employee_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_employee, field, value)
        
        self.db.commit()
        self.db.refresh(db_employee)
        return db_employee
    
    def delete_employee(self, employee_id: int) -> bool:
        """Delete an employee (soft delete by setting is_active to false)"""
        db_employee = self.get_employee_by_id(employee_id)
        if not db_employee:
            return False
        
        db_employee.is_active = False
        self.db.commit()
        return True
    
    def get_employees(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Employee]:
        """Get list of employees with pagination"""
        query = self.db.query(Employee)
        if active_only:
            query = query.filter(Employee.is_active == True)
        return query.offset(skip).limit(limit).all()
    
    def get_employees_count(self, active_only: bool = True) -> int:
        """Get total count of employees"""
        query = self.db.query(Employee)
        if active_only:
            query = query.filter(Employee.is_active == True)
        return query.count()
    
    def search_employees(self, search_term: str, skip: int = 0, limit: int = 100) -> List[Employee]:
        """Search employees by name, employee_id, or email"""
        search_pattern = f"%{search_term}%"
        return self.db.query(Employee).filter(
            (Employee.name.like(search_pattern)) |
            (Employee.employee_id.like(search_pattern)) |
            (Employee.email.like(search_pattern))
        ).filter(Employee.is_active == True).offset(skip).limit(limit).all()
    
    def update_face_encoding(self, employee_id: int, face_encoding: str, image_path: str = None) -> Optional[Employee]:
        """Update employee face encoding and image path"""
        db_employee = self.get_employee_by_id(employee_id)
        if not db_employee:
            return None
        
        db_employee.face_encoding = face_encoding
        if image_path:
            db_employee.face_image_path = image_path
        
        self.db.commit()
        self.db.refresh(db_employee)
        return db_employee
