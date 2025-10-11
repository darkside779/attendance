"""
Shift management API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import time
from app.core.database import get_db
from app.services.shift_service import ShiftService
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

# Pydantic models for request/response
class ShiftCreate(BaseModel):
    employee_id: int
    shift_name: str = Field(..., min_length=1, max_length=50)
    start_time: str = Field(..., regex=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')  # HH:MM format
    end_time: str = Field(..., regex=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')    # HH:MM format
    days_of_week: List[str] = Field(..., min_items=1)
    description: Optional[str] = None

class ShiftUpdate(BaseModel):
    shift_name: Optional[str] = Field(None, min_length=1, max_length=50)
    start_time: Optional[str] = Field(None, regex=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    end_time: Optional[str] = Field(None, regex=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    days_of_week: Optional[List[str]] = None
    description: Optional[str] = None

class ShiftResponse(BaseModel):
    id: int
    employee_id: Optional[int]
    shift_name: str
    start_time: str
    end_time: str
    days_of_week: List[str]
    description: Optional[str]
    is_active: str = "true"  # Default value
    
    class Config:
        from_attributes = True

class ShiftAssignment(BaseModel):
    employee_id: int
    template_id: int

@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new shift for an employee"""
    try:
        shift_service = ShiftService(db)
        
        # Validate days of week
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for day in shift_data.days_of_week:
            if day.lower() not in valid_days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid day: {day}. Must be one of: {', '.join(valid_days)}"
                )
        
        shift = shift_service.create_shift(shift_data.dict())
        
        # Get shift with employee info for response
        shifts_with_employees = shift_service.get_shifts_with_employees()
        created_shift = next((s for s in shifts_with_employees if s["id"] == shift.id), None)
        
        if not created_shift:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created shift"
            )
        
        return created_shift
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create shift: {str(e)}"
        )

@router.get("/", response_model=List[ShiftResponse])
async def get_all_shifts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all shifts with employee information"""
    try:
        shift_service = ShiftService(db)
        shifts = shift_service.get_shifts_with_employees(skip=skip, limit=limit)
        return shifts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve shifts: {str(e)}"
        )

@router.get("/employee/{employee_id}", response_model=List[ShiftResponse])
async def get_employee_shifts(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all shifts for a specific employee"""
    try:
        shift_service = ShiftService(db)
        shifts = shift_service.get_shifts_by_employee(employee_id)
        
        # Convert to response format
        result = []
        for shift in shifts:
            import json
            shift_dict = {
                "id": shift.id,
                "employee_id": shift.employee_id,
                "employee_name": shift.employee.name if shift.employee else None,
                "employee_employee_id": shift.employee.employee_id if shift.employee else None,
                "shift_name": shift.shift_name,
                "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
                "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
                "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
                "description": shift.description,
                "is_active": shift.is_active
            }
            result.append(shift_dict)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve employee shifts: {str(e)}"
        )

@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific shift by ID"""
    try:
        shift_service = ShiftService(db)
        shift = shift_service.get_shift_by_id(shift_id)
        
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shift not found"
            )
        
        # Convert to response format
        import json
        shift_dict = {
            "id": shift.id,
            "employee_id": shift.employee_id,
            "employee_name": shift.employee.name if shift.employee else None,
            "employee_employee_id": shift.employee.employee_id if shift.employee else None,
            "shift_name": shift.shift_name,
            "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
            "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
            "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
            "description": shift.description,
            "is_active": shift.is_active
        }
        
        return shift_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve shift: {str(e)}"
        )

@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing shift"""
    try:
        shift_service = ShiftService(db)
        
        # Validate days of week if provided
        if shift_data.days_of_week:
            valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for day in shift_data.days_of_week:
                if day.lower() not in valid_days:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid day: {day}. Must be one of: {', '.join(valid_days)}"
                    )
        
        # Filter out None values
        update_data = {k: v for k, v in shift_data.dict().items() if v is not None}
        
        shift = shift_service.update_shift(shift_id, update_data)
        
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shift not found"
            )
        
        # Convert to response format
        import json
        shift_dict = {
            "id": shift.id,
            "employee_id": shift.employee_id,
            "employee_name": shift.employee.name if shift.employee else None,
            "employee_employee_id": shift.employee.employee_id if shift.employee else None,
            "shift_name": shift.shift_name,
            "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
            "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
            "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
            "description": shift.description,
            "is_active": shift.is_active
        }
        
        return shift_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update shift: {str(e)}"
        )

@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a shift (soft delete)"""
    try:
        shift_service = ShiftService(db)
        success = shift_service.delete_shift(shift_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shift not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete shift: {str(e)}"
        )

@router.get("/templates/predefined", response_model=List[ShiftResponse])
async def get_shift_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get predefined shift templates"""
    try:
        shift_service = ShiftService(db)
        templates = shift_service.get_shift_templates()
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve shift templates: {str(e)}"
        )

@router.post("/templates/create", response_model=List[ShiftResponse])
async def create_predefined_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create predefined shift templates"""
    try:
        shift_service = ShiftService(db)
        created_shifts = shift_service.create_predefined_shifts()
        
        # Get all templates for response
        templates = shift_service.get_shift_templates()
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create predefined shifts: {str(e)}"
        )

@router.post("/assign", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def assign_shift_to_employee(
    assignment: ShiftAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a shift template to an employee"""
    try:
        shift_service = ShiftService(db)
        shift = shift_service.assign_shift_to_employee(
            assignment.employee_id, 
            assignment.template_id
        )
        
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shift template not found"
            )
        
        # Get shift with employee info for response
        shifts_with_employees = shift_service.get_shifts_with_employees()
        assigned_shift = next((s for s in shifts_with_employees if s["id"] == shift.id), None)
        
        if not assigned_shift:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve assigned shift"
            )
        
        return assigned_shift
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign shift: {str(e)}"
        )

@router.get("/employee/{employee_id}/current/{day}")
async def get_employee_current_shift(
    employee_id: int,
    day: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee's current shift for a specific day"""
    try:
        shift_service = ShiftService(db)
        shift = shift_service.get_employee_current_shift(employee_id, day)
        
        if not shift:
            return {"message": f"No shift found for employee {employee_id} on {day}"}
        
        return shift
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve current shift: {str(e)}"
        )
