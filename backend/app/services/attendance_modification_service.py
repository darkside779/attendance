"""
Attendance modification service with audit trail
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.attendance_modification import AttendanceModification
from app.models.user import User

class AttendanceModificationService:
    def __init__(self, db: Session):
        self.db = db

    def modify_attendance(self, attendance_id: int, field_name: str, new_value: str, 
                         reason: str, modified_by_user_id: int) -> bool:
        """
        Modify attendance record with audit trail
        
        Args:
            attendance_id: ID of attendance record to modify
            field_name: Field to modify ('check_in', 'check_out', 'status', 'notes')
            new_value: New value for the field
            reason: Reason for modification
            modified_by_user_id: ID of user making the modification
        """
        try:
            # Get attendance record
            attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
            if not attendance:
                return False
            
            # Get old value
            old_value = getattr(attendance, field_name, None)
            if old_value is not None:
                old_value = str(old_value)
            
            # Update the field
            if field_name == 'check_in' or field_name == 'check_out':
                # Parse datetime string - handle multiple formats
                if new_value and new_value != 'None':
                    try:
                        # Try HTML datetime-local format first (2025-10-11T16:00)
                        if 'T' in new_value:
                            new_datetime = datetime.strptime(new_value, '%Y-%m-%dT%H:%M')
                        else:
                            # Try standard format
                            new_datetime = datetime.strptime(new_value, '%Y-%m-%d %H:%M:%S')
                        setattr(attendance, field_name, new_datetime)
                    except ValueError as e:
                        print(f"Error parsing datetime '{new_value}': {e}")
                        return False
                else:
                    setattr(attendance, field_name, None)
            else:
                setattr(attendance, field_name, new_value)
            
            # Recalculate total hours if check_in or check_out changed
            if field_name in ['check_in', 'check_out']:
                self._recalculate_total_hours(attendance)
            
            # Create modification record
            modification = AttendanceModification(
                attendance_id=attendance_id,
                modified_by=modified_by_user_id,
                field_changed=field_name,
                old_value=old_value,
                new_value=new_value,
                reason=reason
            )
            
            self.db.add(modification)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error modifying attendance: {e}")
            return False

    def _recalculate_total_hours(self, attendance: Attendance):
        """Recalculate total hours based on check_in and check_out times"""
        if attendance.check_in and attendance.check_out:
            time_diff = attendance.check_out - attendance.check_in
            attendance.total_hours = time_diff.total_seconds() / 3600  # Convert to hours
        else:
            attendance.total_hours = 0.0

    def get_modification_history(self, attendance_id: int) -> List[dict]:
        """Get modification history for an attendance record"""
        modifications = self.db.query(AttendanceModification).join(User).filter(
            AttendanceModification.attendance_id == attendance_id
        ).order_by(AttendanceModification.modification_date.desc()).all()
        
        history = []
        for mod in modifications:
            history.append({
                'id': mod.id,
                'field_changed': mod.field_changed,
                'old_value': mod.old_value,
                'new_value': mod.new_value,
                'reason': mod.reason,
                'modified_by': mod.modifier.username,
                'modification_date': mod.modification_date.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return history

    def get_all_modifications(self, limit: int = 100, offset: int = 0) -> List[dict]:
        """Get all attendance modifications with pagination"""
        modifications = self.db.query(AttendanceModification).join(User).join(Attendance).order_by(
            AttendanceModification.modification_date.desc()
        ).offset(offset).limit(limit).all()
        
        result = []
        for mod in modifications:
            result.append({
                'id': mod.id,
                'attendance_id': mod.attendance_id,
                'employee_name': mod.attendance.employee.name,
                'employee_id': mod.attendance.employee.employee_id,
                'date': mod.attendance.date,
                'field_changed': mod.field_changed,
                'old_value': mod.old_value,
                'new_value': mod.new_value,
                'reason': mod.reason,
                'modified_by': mod.modifier.username,
                'modification_date': mod.modification_date.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return result

    def bulk_modify_attendance(self, modifications: List[dict], modified_by_user_id: int) -> dict:
        """
        Perform bulk modifications on attendance records
        
        Args:
            modifications: List of modification dictionaries
            modified_by_user_id: ID of user making modifications
            
        Returns:
            Dictionary with success/failure counts
        """
        success_count = 0
        failure_count = 0
        errors = []
        
        for mod in modifications:
            try:
                success = self.modify_attendance(
                    attendance_id=mod['attendance_id'],
                    field_name=mod['field_name'],
                    new_value=mod['new_value'],
                    reason=mod['reason'],
                    modified_by_user_id=modified_by_user_id
                )
                
                if success:
                    success_count += 1
                else:
                    failure_count += 1
                    errors.append(f"Failed to modify attendance ID {mod['attendance_id']}")
                    
            except Exception as e:
                failure_count += 1
                errors.append(f"Error modifying attendance ID {mod.get('attendance_id', 'unknown')}: {str(e)}")
        
        return {
            'success_count': success_count,
            'failure_count': failure_count,
            'errors': errors
        }
