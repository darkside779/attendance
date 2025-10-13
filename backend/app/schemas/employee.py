"""
Employee schemas for API requests and responses
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class EmployeeBase(BaseModel):
    employee_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    salary_rate: Optional[int] = 0  # Rate per hour in cents

class EmployeeCreate(EmployeeBase):
    hire_date: Optional[datetime] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    salary_rate: Optional[int] = None
    is_active: Optional[bool] = None

class EmployeeInDB(EmployeeBase):
    id: int
    face_encoding: Optional[str] = None
    face_image_path: Optional[str] = None
    hire_date: Optional[datetime] = None
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Employee(EmployeeInDB):
    pass

class EmployeeList(BaseModel):
    employees: List[Employee]
    total: int
    page: int
    per_page: int
