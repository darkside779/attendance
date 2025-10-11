"""
Reports and attendance modification routes
"""
import io
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.services.report_service import ReportService
from app.services.attendance_modification_service import AttendanceModificationService
from app.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class AttendanceModificationRequest(BaseModel):
    attendance_id: int
    field_name: str  # 'check_in', 'check_out', 'status', 'notes'
    new_value: str
    reason: str

class BulkModificationRequest(BaseModel):
    modifications: List[AttendanceModificationRequest]

@router.get("/pdf")
async def generate_pdf_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate PDF attendance report"""
    try:
        report_service = ReportService(db)
        pdf_buffer = report_service.generate_pdf_report(start_date, end_date, employee_id)
        
        # Generate filename
        filename = "attendance_report"
        if start_date and end_date:
            filename += f"_{start_date}_{end_date}"
        filename += ".pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF report: {str(e)}"
        )

@router.get("/excel")
async def generate_excel_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate Excel attendance report"""
    try:
        report_service = ReportService(db)
        excel_buffer = report_service.generate_excel_report(start_date, end_date, employee_id)
        
        # Generate filename
        filename = "attendance_report"
        if start_date and end_date:
            filename += f"_{start_date}_{end_date}"
        filename += ".xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel report: {str(e)}"
        )

@router.get("/employee-summary/{employee_id}")
async def get_employee_summary(
    employee_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance summary for specific employee"""
    try:
        report_service = ReportService(db)
        summary = report_service.get_employee_summary(employee_id, start_date, end_date)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating employee summary: {str(e)}"
        )

@router.post("/modify-attendance")
async def modify_attendance(
    modification: AttendanceModificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modify attendance record with reason"""
    try:
        modification_service = AttendanceModificationService(db)
        success = modification_service.modify_attendance(
            attendance_id=modification.attendance_id,
            field_name=modification.field_name,
            new_value=modification.new_value,
            reason=modification.reason,
            modified_by_user_id=current_user.id
        )
        
        if success:
            return {"success": True, "message": "Attendance record modified successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to modify attendance record"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error modifying attendance: {str(e)}"
        )

@router.post("/bulk-modify")
async def bulk_modify_attendance(
    bulk_request: BulkModificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform bulk modifications on attendance records"""
    try:
        modification_service = AttendanceModificationService(db)
        
        # Convert Pydantic models to dictionaries
        modifications = [mod.dict() for mod in bulk_request.modifications]
        
        result = modification_service.bulk_modify_attendance(
            modifications=modifications,
            modified_by_user_id=current_user.id
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing bulk modifications: {str(e)}"
        )

@router.get("/modification-history/{attendance_id}")
async def get_modification_history(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get modification history for an attendance record"""
    try:
        modification_service = AttendanceModificationService(db)
        history = modification_service.get_modification_history(attendance_id)
        return {"attendance_id": attendance_id, "modifications": history}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving modification history: {str(e)}"
        )

@router.get("/all-modifications")
async def get_all_modifications(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all attendance modifications with pagination"""
    try:
        modification_service = AttendanceModificationService(db)
        modifications = modification_service.get_all_modifications(limit, offset)
        return {"modifications": modifications, "limit": limit, "offset": offset}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving modifications: {str(e)}"
        )
