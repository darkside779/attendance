"""
Attendance tracking routes
"""
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import json

from app.core.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.services.simple_face_service import simple_face_service
from app.services.employee_service import EmployeeService
from app.services.attendance_service import AttendanceService
from app.routes.auth import get_current_user

router = APIRouter()

@router.post("/check-in")
async def check_in_with_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    employee_id: Optional[str] = Form(None)
):
    """Check in employee using face recognition"""
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        # Read image data
        image_data = await file.read()
        print(f"DEBUG CHECK-IN: Received image data of size: {len(image_data)} bytes")
        print(f"DEBUG CHECK-IN: File content type: {file.content_type}")
        
        employee_service = EmployeeService(db)
        
        # If employee_id is provided (from real-time detection), use it directly
        if employee_id:
            print(f"DEBUG CHECK-IN: Using provided employee_id: {employee_id}")
            employee = employee_service.get_employee_by_employee_id(employee_id)
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee with ID {employee_id} not found"
                )
            confidence = 0.1  # High confidence since it's from real-time detection
            employee_db_id = employee.id
        else:
            # Fallback to face recognition
            print("DEBUG CHECK-IN: No employee_id provided, using face recognition")
            unknown_features = simple_face_service.extract_face_features_for_checkin(image_data)
            print(f"DEBUG CHECK-IN: Extracted features: {len(unknown_features) if unknown_features else 0}")
            
            # Get employees with face data
            employees = employee_service.get_employees(active_only=True)
            
            known_features = []
            for emp in employees:
                if emp.face_encoding:
                    try:
                        features = json.loads(emp.face_encoding)
                        known_features.append((emp.id, features))
                    except json.JSONDecodeError:
                        continue
            
            if not known_features:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No employees with face data found"
                )
            
            # Find matching employee
            match_result = simple_face_service.find_best_match(unknown_features, known_features)
            
            if not match_result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Employee not recognized"
                )
            
            employee_db_id, confidence = match_result
            employee = employee_service.get_employee_by_id(employee_db_id)
        
        # Use enhanced attendance service with shift integration
        attendance_service = AttendanceService(db)
        check_in_result = attendance_service.check_in_employee(employee_db_id)
        
        if not check_in_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=check_in_result["message"]
            )
        
        return {
            "success": True,
            "message": check_in_result["message"],
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": employee.name,
                "department": employee.department
            },
            "attendance": {
                "id": check_in_result["attendance_id"],
                "check_in_time": check_in_result["check_in_time"],
                "status": check_in_result["status"],
                "shift_info": check_in_result["shift_info"]
            },
            "recognition_confidence": round((1 - confidence) * 100, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during check-in: {str(e)}"
        )

@router.post("/check-out")
async def check_out_with_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Check out employee using face recognition"""
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        # Process face recognition (same as check-in)
        image_data = await file.read()
        unknown_features = simple_face_service.extract_face_features_for_checkin(image_data)
        
        if not unknown_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the image"
            )
        
        # Find matching employee
        employee_service = EmployeeService(db)
        employees = employee_service.get_employees(active_only=True)
        
        known_features = []
        for employee in employees:
            if employee.face_encoding:
                try:
                    features = json.loads(employee.face_encoding)
                    known_features.append((employee.id, features))
                except json.JSONDecodeError:
                    continue
        
        match_result = simple_face_service.find_best_match(unknown_features, known_features)
        
        if not match_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not recognized"
            )
        
        employee_id, confidence = match_result
        employee = employee_service.get_employee_by_id(employee_id)
        
        # Use enhanced attendance service with shift integration
        attendance_service = AttendanceService(db)
        check_out_result = attendance_service.check_out_employee(employee_id)
        
        if not check_out_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=check_out_result["message"]
            )
        
        return {
            "success": True,
            "message": check_out_result["message"],
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": employee.name,
                "department": employee.department
            },
            "attendance": {
                "id": check_out_result["attendance_id"],
                "check_out_time": check_out_result["check_out_time"],
                "total_hours": check_out_result["total_hours"],
                "regular_hours": check_out_result["regular_hours"],
                "overtime_hours": check_out_result["overtime_hours"]
            },
            "recognition_confidence": round((1 - confidence) * 100, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during check-out: {str(e)}"
        )

@router.get("/employee/{employee_id}/today")
async def get_employee_attendance_today(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee's attendance record for today with shift information"""
    try:
        attendance_service = AttendanceService(db)
        attendance_data = attendance_service.get_employee_attendance_today(employee_id)
        
        if not attendance_data:
            return {
                "message": "No attendance record found for today",
                "attendance": None
            }
        
        return {
            "message": "Attendance record retrieved successfully",
            "attendance": attendance_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving attendance: {str(e)}"
        )

@router.get("/records")
async def get_attendance_records_with_shifts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance records with shift information"""
    try:
        attendance_service = AttendanceService(db)
        records = attendance_service.get_attendance_records(
            skip=skip, 
            limit=limit, 
            start_date=start_date, 
            end_date=end_date
        )
        
        return {
            "message": f"Retrieved {len(records)} attendance records",
            "records": records,
            "total": len(records)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving attendance records: {str(e)}"
        )

@router.get("/shift-compliance-report")
async def get_shift_compliance_report(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate shift compliance report"""
    try:
        attendance_service = AttendanceService(db)
        report = attendance_service.get_shift_compliance_report(start_date, end_date)
        
        return {
            "message": "Shift compliance report generated successfully",
            "report": report
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )

@router.put("/assign-shift/{attendance_id}")
async def assign_shift_to_attendance_record(
    attendance_id: int,
    shift_id: int = Query(..., description="Shift ID to assign"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually assign a shift to an attendance record"""
    try:
        attendance_service = AttendanceService(db)
        success = attendance_service.assign_shift_to_attendance(attendance_id, shift_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        return {
            "message": "Shift assigned to attendance record successfully",
            "attendance_id": attendance_id,
            "shift_id": shift_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning shift: {str(e)}"
        )

@router.get("/today")
async def get_today_attendance(
    date_param: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance summary for a specific date (defaults to today)"""
    
    try:
        if date_param:
            target_date = date_param
        else:
            target_date = date.today().strftime('%Y-%m-%d')
        
        # Get all attendance records for the target date
        today_records = db.query(Attendance).filter(Attendance.date == target_date).all()
        print(f"DEBUG: Querying attendance for date: {target_date}")
        print(f"DEBUG: Found {len(today_records)} attendance records")
        
        # Get total employees
        total_employees = db.query(Employee).filter(Employee.is_active == "true").count()
        
        # Calculate statistics
        present_count = len(today_records)
        checked_out_count = len([r for r in today_records if r.check_out])
        still_in_count = present_count - checked_out_count
        absent_count = total_employees - present_count
        
        # Format records
        formatted_records = []
        for record in today_records:
            formatted_record = {
                "id": record.id,  # Add the attendance record ID
                "employee_id": record.employee_id,
                "employee_name": record.employee.name if record.employee else "Unknown",
                "employee_code": record.employee.employee_id if record.employee else "Unknown",
                "check_in": record.check_in.strftime('%H:%M:%S') if record.check_in else None,
                "check_out": record.check_out.strftime('%H:%M:%S') if record.check_out else None,
                "total_hours": record.total_hours,
                "status": record.status if record.status else ("present" if record.check_in else "absent")
            }
            formatted_records.append(formatted_record)
        
        return {
            "date": target_date,
            "summary": {
                "total_employees": total_employees,
                "present": present_count,
                "absent": absent_count,
                "checked_out": checked_out_count,
                "still_in": still_in_count
            },
            "records": formatted_records
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving today's attendance: {str(e)}"
        )
