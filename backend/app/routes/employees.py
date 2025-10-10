"""
Employee management routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.employee import Employee, EmployeeCreate, EmployeeUpdate, EmployeeList
from app.services.employee_service import EmployeeService
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=Employee)
async def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new employee (Admin and Accounting can create)"""
    employee_service = EmployeeService(db)
    
    # Check if employee ID already exists
    existing_employee = employee_service.get_employee_by_employee_id(employee.employee_id)
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )
    
    # Create new employee
    new_employee = employee_service.create_employee(employee, current_user.id)
    return new_employee

@router.get("/", response_model=EmployeeList)
async def get_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of employees with pagination and search"""
    employee_service = EmployeeService(db)
    
    if search:
        employees = employee_service.search_employees(search, skip, limit)
        total = len(employees)  # For search, we'll use the result count
    else:
        employees = employee_service.get_employees(skip, limit, active_only)
        total = employee_service.get_employees_count(active_only)
    
    return EmployeeList(
        employees=employees,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )

@router.get("/{employee_id}", response_model=Employee)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee by ID"""
    employee_service = EmployeeService(db)
    employee = employee_service.get_employee_by_id(employee_id)
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee

@router.put("/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update employee information"""
    employee_service = EmployeeService(db)
    
    updated_employee = employee_service.update_employee(employee_id, employee_update)
    if not updated_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return updated_employee

@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete employee (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete employees"
        )
    
    employee_service = EmployeeService(db)
    success = employee_service.delete_employee(employee_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return {"message": "Employee deleted successfully"}

@router.get("/search/{employee_id_or_name}")
async def search_employee_by_id_or_name(
    employee_id_or_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search employee by employee ID or name"""
    employee_service = EmployeeService(db)
    
    # First try to find by employee_id
    employee = employee_service.get_employee_by_employee_id(employee_id_or_name)
    if employee:
        return employee
    
    # If not found, search by name
    employees = employee_service.search_employees(employee_id_or_name, 0, 10)
    if not employees:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employees found"
        )
    
    return {"employees": employees, "count": len(employees)}
