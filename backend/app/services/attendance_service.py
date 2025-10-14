"""
Attendance service with shift integration
"""
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.shift import Shift
from app.services.shift_service import ShiftService
from datetime import datetime, date, time
import json

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
        self.shift_service = ShiftService(db)

    def check_in_employee(self, employee_id: int, check_in_time: datetime = None) -> Dict:
        """
        Check in an employee and automatically detect their shift
        """
        if check_in_time is None:
            check_in_time = datetime.now()
        
        # Ensure check_in_time is timezone-naive
        check_in_time = check_in_time.replace(tzinfo=None) if check_in_time.tzinfo else check_in_time
        
        today = check_in_time.date().strftime('%Y-%m-%d')
        day_name = check_in_time.strftime('%A').lower()
        
        # Check if employee already checked in today
        existing_attendance = self.db.query(Attendance).filter(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date == today,
                Attendance.check_out.is_(None)
            )
        ).first()
        
        if existing_attendance:
            return {
                "success": False,
                "message": "Employee already checked in today",
                "attendance_id": existing_attendance.id
            }
        
        # Find employee's shift for today
        current_shift = self.shift_service.get_employee_current_shift(employee_id, day_name)
        shift_id = None
        shift_info = None
        status = "present"
        
        if current_shift:
            shift_id = current_shift["id"]
            shift_info = current_shift
            
            # Check if employee is late
            shift_start_time = datetime.strptime(current_shift["start_time"], '%H:%M').time()
            check_in_time_only = check_in_time.time()
            
            # Consider late if more than 15 minutes after shift start
            late_threshold = datetime.combine(date.today(), shift_start_time)
            late_threshold = late_threshold.replace(minute=late_threshold.minute + 15)
            
            if check_in_time_only > late_threshold.time():
                status = "late"
        
        # Create attendance record
        attendance = Attendance(
            employee_id=employee_id,
            shift_id=shift_id,
            check_in=check_in_time,
            date=today,
            status=status
        )
        
        self.db.add(attendance)
        self.db.commit()
        self.db.refresh(attendance)
        
        return {
            "success": True,
            "message": f"Employee checked in successfully {'(Late)' if status == 'late' else ''}",
            "attendance_id": attendance.id,
            "check_in_time": check_in_time.isoformat(),
            "shift_info": shift_info,
            "status": status
        }

    def check_out_employee(self, employee_id: int, check_out_time: datetime = None) -> Dict:
        """
        Check out an employee and calculate work hours
        """
        if check_out_time is None:
            check_out_time = datetime.now()
        
        # Ensure check_out_time is timezone-naive
        check_out_time = check_out_time.replace(tzinfo=None) if check_out_time.tzinfo else check_out_time
        
        today = check_out_time.date().strftime('%Y-%m-%d')
        
        # Find today's attendance record
        attendance = self.db.query(Attendance).filter(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date == today,
                Attendance.check_out.is_(None)
            )
        ).first()
        
        if not attendance:
            return {
                "success": False,
                "message": "No check-in record found for today"
            }
        
        # Calculate total hours - ensure both datetimes are timezone-naive
        check_out_naive = check_out_time.replace(tzinfo=None) if check_out_time.tzinfo else check_out_time
        check_in_naive = attendance.check_in.replace(tzinfo=None) if attendance.check_in.tzinfo else attendance.check_in
        
        time_diff = check_out_naive - check_in_naive
        total_hours = time_diff.total_seconds() / 3600
        
        # Calculate overtime if shift is assigned
        overtime_hours = 0.0
        regular_hours = total_hours
        
        if attendance.shift_id:
            shift = self.db.query(Shift).filter(Shift.id == attendance.shift_id).first()
            if shift:
                # Calculate expected shift duration
                shift_start = datetime.strptime(shift.start_time.strftime('%H:%M'), '%H:%M').time()
                shift_end = datetime.strptime(shift.end_time.strftime('%H:%M'), '%H:%M').time()
                
                # Handle overnight shifts
                if shift_end < shift_start:
                    shift_duration = (24 - shift_start.hour - shift_start.minute/60) + (shift_end.hour + shift_end.minute/60)
                else:
                    shift_duration = (shift_end.hour + shift_end.minute/60) - (shift_start.hour + shift_start.minute/60)
                
                if total_hours > shift_duration:
                    overtime_hours = total_hours - shift_duration
                    regular_hours = shift_duration
        
        # Update attendance record
        attendance.check_out = check_out_time
        attendance.total_hours = total_hours
        attendance.overtime_hours = overtime_hours
        
        self.db.commit()
        self.db.refresh(attendance)
        
        return {
            "success": True,
            "message": "Employee checked out successfully",
            "attendance_id": attendance.id,
            "check_out_time": check_out_time.isoformat(),
            "total_hours": round(total_hours, 2),
            "regular_hours": round(regular_hours, 2),
            "overtime_hours": round(overtime_hours, 2)
        }

    def get_employee_attendance_today(self, employee_id: int) -> Optional[Dict]:
        """
        Get employee's attendance record for today
        """
        today = datetime.now().date().strftime('%Y-%m-%d')
        
        attendance = self.db.query(Attendance).filter(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date == today
            )
        ).first()
        
        if not attendance:
            return None
        
        # Get shift info if available
        shift_info = None
        if attendance.shift_id:
            shift = self.db.query(Shift).filter(Shift.id == attendance.shift_id).first()
            if shift:
                shift_info = {
                    "id": shift.id,
                    "shift_name": shift.shift_name,
                    "start_time": shift.start_time.strftime('%H:%M'),
                    "end_time": shift.end_time.strftime('%H:%M'),
                    "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else []
                }
        
        return {
            "id": attendance.id,
            "employee_id": attendance.employee_id,
            "shift_id": attendance.shift_id,
            "shift_info": shift_info,
            "check_in": attendance.check_in.isoformat() if attendance.check_in else None,
            "check_out": attendance.check_out.isoformat() if attendance.check_out else None,
            "total_hours": attendance.total_hours,
            "overtime_hours": attendance.overtime_hours,
            "date": attendance.date,
            "status": attendance.status,
            "notes": attendance.notes
        }

    def get_attendance_records(self, skip: int = 0, limit: int = 100, 
                             start_date: str = None, end_date: str = None) -> List[Dict]:
        """
        Get attendance records with shift information
        """
        query = self.db.query(Attendance).join(Employee)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        records = query.offset(skip).limit(limit).all()
        
        result = []
        for record in records:
            # Get shift info if available
            shift_info = None
            if record.shift_id:
                shift = self.db.query(Shift).filter(Shift.id == record.shift_id).first()
                if shift:
                    shift_info = {
                        "id": shift.id,
                        "shift_name": shift.shift_name,
                        "start_time": shift.start_time.strftime('%H:%M'),
                        "end_time": shift.end_time.strftime('%H:%M')
                    }
            
            record_dict = {
                "id": record.id,
                "employee_id": record.employee_id,
                "employee_name": record.employee.name,
                "employee_employee_id": record.employee.employee_id,
                "shift_id": record.shift_id,
                "shift_info": shift_info,
                "check_in": record.check_in.isoformat() if record.check_in else None,
                "check_out": record.check_out.isoformat() if record.check_out else None,
                "total_hours": record.total_hours,
                "overtime_hours": record.overtime_hours,
                "date": record.date,
                "status": record.status,
                "notes": record.notes,
                "created_at": record.created_at.isoformat() if record.created_at else None
            }
            result.append(record_dict)
        
        return result

    def get_shift_compliance_report(self, start_date: str, end_date: str) -> Dict:
        """
        Generate a report showing shift compliance
        """
        # Get all attendance records in date range
        records = self.db.query(Attendance).join(Employee).filter(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
        ).all()
        
        total_records = len(records)
        on_time_records = len([r for r in records if r.status == "present"])
        late_records = len([r for r in records if r.status == "late"])
        absent_records = len([r for r in records if r.status == "absent"])
        
        # Calculate shift coverage
        records_with_shifts = len([r for r in records if r.shift_id is not None])
        shift_coverage_percentage = (records_with_shifts / total_records * 100) if total_records > 0 else 0
        
        # Calculate average hours per shift type
        shift_stats = {}
        for record in records:
            if record.shift_id and record.total_hours:
                shift = self.db.query(Shift).filter(Shift.id == record.shift_id).first()
                if shift:
                    shift_name = shift.shift_name
                    if shift_name not in shift_stats:
                        shift_stats[shift_name] = {"total_hours": 0, "count": 0, "overtime_hours": 0}
                    
                    shift_stats[shift_name]["total_hours"] += record.total_hours
                    shift_stats[shift_name]["overtime_hours"] += record.overtime_hours or 0
                    shift_stats[shift_name]["count"] += 1
        
        # Calculate averages
        for shift_name in shift_stats:
            count = shift_stats[shift_name]["count"]
            shift_stats[shift_name]["avg_hours"] = shift_stats[shift_name]["total_hours"] / count
            shift_stats[shift_name]["avg_overtime"] = shift_stats[shift_name]["overtime_hours"] / count
        
        return {
            "period": f"{start_date} to {end_date}",
            "total_records": total_records,
            "on_time_records": on_time_records,
            "late_records": late_records,
            "absent_records": absent_records,
            "on_time_percentage": (on_time_records / total_records * 100) if total_records > 0 else 0,
            "late_percentage": (late_records / total_records * 100) if total_records > 0 else 0,
            "shift_coverage_percentage": shift_coverage_percentage,
            "shift_statistics": shift_stats
        }

    def assign_shift_to_attendance(self, attendance_id: int, shift_id: int) -> bool:
        """
        Manually assign a shift to an attendance record
        """
        attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not attendance:
            return False
        
        attendance.shift_id = shift_id
        self.db.commit()
        return True
