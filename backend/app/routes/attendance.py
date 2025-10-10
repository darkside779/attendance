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
from app.routes.auth import get_current_user

router = APIRouter()

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_today_attendance(self, employee_id: int) -> Optional[Attendance]:
        """Get today's attendance record for an employee"""
        today = date.today().strftime('%Y-%m-%d')
        return self.db.query(Attendance).filter(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date == today
            )
        ).first()
    
    def create_attendance_record(self, employee_id: int, check_in_time: datetime) -> Attendance:
        """Create new attendance record"""
        today = date.today().strftime('%Y-%m-%d')
        
        attendance = Attendance(
            employee_id=employee_id,
            check_in=check_in_time,
            date=today,
            status="present"
        )
        
        self.db.add(attendance)
        self.db.commit()
        self.db.refresh(attendance)
        return attendance
    
    def update_checkout(self, attendance_id: int, check_out_time: datetime) -> Attendance:
        """Update attendance record with checkout time"""
        attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
        
        if attendance:
            attendance.check_out = check_out_time
            
            # Calculate total hours
            if attendance.check_in:
                time_diff = check_out_time - attendance.check_in
                total_hours = time_diff.total_seconds() / 3600
                attendance.total_hours = round(total_hours, 2)
            
            self.db.commit()
            self.db.refresh(attendance)
        
        return attendance
    
    def get_attendance_records(self, skip: int = 0, limit: int = 100, 
                             employee_id: Optional[int] = None,
                             start_date: Optional[date] = None,
                             end_date: Optional[date] = None) -> List[Attendance]:
        """Get attendance records with filters"""
        query = self.db.query(Attendance)
        
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date.strftime('%Y-%m-%d'))
        
        if end_date:
            query = query.filter(Attendance.date <= end_date.strftime('%Y-%m-%d'))
        
        return query.order_by(Attendance.created_at.desc()).offset(skip).limit(limit).all()

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
        
        # Check attendance service
        attendance_service = AttendanceService(db)
        today_attendance = attendance_service.get_today_attendance(employee_db_id)
        
        if today_attendance and today_attendance.check_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {employee.name} has already checked in today at {today_attendance.check_in.strftime('%H:%M:%S')}"
            )
        
        # Create check-in record
        check_in_time = datetime.now()
        attendance_record = attendance_service.create_attendance_record(employee_db_id, check_in_time)
        
        return {
            "success": True,
            "message": f"Check-in successful for {employee.name}",
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": employee.name,
                "department": employee.department
            },
            "attendance": {
                "id": attendance_record.id,
                "check_in_time": check_in_time.strftime('%Y-%m-%d %H:%M:%S'),
                "date": attendance_record.date
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
        
        # Check if employee has checked in today
        attendance_service = AttendanceService(db)
        today_attendance = attendance_service.get_today_attendance(employee_id)
        
        if not today_attendance or not today_attendance.check_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {employee.name} has not checked in today"
            )
        
        if today_attendance.check_out:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {employee.name} has already checked out today at {today_attendance.check_out.strftime('%H:%M:%S')}"
            )
        
        # Update with check-out time
        check_out_time = datetime.now()
        updated_attendance = attendance_service.update_checkout(today_attendance.id, check_out_time)
        
        return {
            "success": True,
            "message": f"Check-out successful for {employee.name}",
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": employee.name,
                "department": employee.department
            },
            "attendance": {
                "id": updated_attendance.id,
                "check_in_time": updated_attendance.check_in.strftime('%Y-%m-%d %H:%M:%S'),
                "check_out_time": check_out_time.strftime('%Y-%m-%d %H:%M:%S'),
                "total_hours": updated_attendance.total_hours,
                "date": updated_attendance.date
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

@router.get("/records")
async def get_attendance_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    employee_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance records with filters"""
    
    try:
        # Parse dates if provided
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        attendance_service = AttendanceService(db)
        records = attendance_service.get_attendance_records(
            skip=skip,
            limit=limit,
            employee_id=employee_id,
            start_date=start_date_obj,
            end_date=end_date_obj
        )
        
        # Format response
        formatted_records = []
        for record in records:
            formatted_record = {
                "id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.name if record.employee else "Unknown",
                "employee_code": record.employee.employee_id if record.employee else "Unknown",
                "date": record.date,
                "check_in": record.check_in.strftime('%H:%M:%S') if record.check_in else None,
                "check_out": record.check_out.strftime('%H:%M:%S') if record.check_out else None,
                "total_hours": record.total_hours,
                "status": record.status,
                "notes": record.notes
            }
            formatted_records.append(formatted_record)
        
        return {
            "records": formatted_records,
            "total": len(formatted_records),
            "skip": skip,
            "limit": limit
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving attendance records: {str(e)}"
        )

@router.get("/today")
async def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's attendance summary"""
    
    try:
        today = date.today().strftime('%Y-%m-%d')
        
        # Get all attendance records for today
        today_records = db.query(Attendance).filter(Attendance.date == today).all()
        
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
                "employee_id": record.employee_id,
                "employee_name": record.employee.name if record.employee else "Unknown",
                "employee_code": record.employee.employee_id if record.employee else "Unknown",
                "check_in": record.check_in.strftime('%H:%M:%S') if record.check_in else None,
                "check_out": record.check_out.strftime('%H:%M:%S') if record.check_out else None,
                "total_hours": record.total_hours,
                "status": "checked_out" if record.check_out else "checked_in"
            }
            formatted_records.append(formatted_record)
        
        return {
            "date": today,
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
