"""
Shift management service for handling employee work shifts
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.shift import Shift
from app.models.employee import Employee
import json
from datetime import time, datetime

class ShiftService:
    def __init__(self, db: Session):
        self.db = db

    def create_shift(self, shift_data: dict) -> Shift:
        """Create a new shift for an employee"""
        # Convert days_of_week list to JSON string
        if isinstance(shift_data.get('days_of_week'), list):
            shift_data['days_of_week'] = json.dumps(shift_data['days_of_week'])
        
        # Convert time strings to time objects if needed
        if isinstance(shift_data.get('start_time'), str):
            shift_data['start_time'] = datetime.strptime(shift_data['start_time'], '%H:%M').time()
        if isinstance(shift_data.get('end_time'), str):
            shift_data['end_time'] = datetime.strptime(shift_data['end_time'], '%H:%M').time()
        
        # Ensure is_active is set
        if 'is_active' not in shift_data:
            shift_data['is_active'] = True
        
        shift = Shift(**shift_data)
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def get_shift_by_id(self, shift_id: int) -> Optional[Shift]:
        """Get shift by ID"""
        return self.db.query(Shift).filter(Shift.id == shift_id).first()

    def get_shifts_by_employee(self, employee_id: int) -> List[Shift]:
        """Get all shifts for a specific employee"""
        return self.db.query(Shift).filter(
            and_(Shift.employee_id == employee_id, Shift.is_active == True)
        ).all()

    def get_all_shifts(self, skip: int = 0, limit: int = 100) -> List[Shift]:
        """Get all shifts with pagination"""
        return self.db.query(Shift).filter(Shift.is_active == True).offset(skip).limit(limit).all()

    def update_shift(self, shift_id: int, shift_data: dict) -> Optional[Shift]:
        """Update an existing shift"""
        shift = self.get_shift_by_id(shift_id)
        if not shift:
            return None
        
        # Convert days_of_week list to JSON string
        if isinstance(shift_data.get('days_of_week'), list):
            shift_data['days_of_week'] = json.dumps(shift_data['days_of_week'])
        
        # Convert time strings to time objects if needed
        if isinstance(shift_data.get('start_time'), str):
            shift_data['start_time'] = datetime.strptime(shift_data['start_time'], '%H:%M').time()
        if isinstance(shift_data.get('end_time'), str):
            shift_data['end_time'] = datetime.strptime(shift_data['end_time'], '%H:%M').time()
        
        for key, value in shift_data.items():
            if hasattr(shift, key):
                setattr(shift, key, value)
        
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def delete_shift(self, shift_id: int) -> bool:
        """Soft delete a shift (mark as inactive)"""
        shift = self.get_shift_by_id(shift_id)
        if not shift:
            return False
        
        shift.is_active = False
        self.db.commit()
        return True

    def get_shifts_with_employees(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all shifts with employee information"""
        shifts = self.db.query(Shift).join(Employee).filter(
            Shift.is_active == True
        ).offset(skip).limit(limit).all()
        
        result = []
        for shift in shifts:
            shift_dict = {
                "id": shift.id,
                "employee_id": shift.employee_id,
                "employee_name": shift.employee.name,
                "employee_employee_id": shift.employee.employee_id,
                "shift_name": shift.shift_name,
                "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
                "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
                "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
                "description": shift.description,
                "is_active": shift.is_active,
                "created_at": shift.created_at,
                "updated_at": shift.updated_at
            }
            result.append(shift_dict)
        
        return result

    def get_employee_current_shift(self, employee_id: int, current_day: str) -> Optional[dict]:
        """Get employee's current shift for a specific day"""
        shifts = self.get_shifts_by_employee(employee_id)
        
        for shift in shifts:
            try:
                days_list = json.loads(shift.days_of_week) if shift.days_of_week else []
                if current_day.lower() in [day.lower() for day in days_list]:
                    return {
                        "id": shift.id,
                        "shift_name": shift.shift_name,
                        "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
                        "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
                        "description": shift.description
                    }
            except (json.JSONDecodeError, AttributeError):
                continue
        
        return None

    def create_predefined_shifts(self) -> List[Shift]:
        """Create common predefined shift templates"""
        predefined_shifts = [
            {
                "shift_name": "Morning Shift",
                "start_time": time(9, 0),  # 9:00 AM
                "end_time": time(17, 0),   # 5:00 PM
                "days_of_week": json.dumps(["monday", "tuesday", "wednesday", "thursday", "friday"]),
                "description": "Standard morning shift - 9 AM to 5 PM, Monday to Friday",
                "is_active": True
            },
            {
                "shift_name": "Evening Shift", 
                "start_time": time(14, 0), # 2:00 PM
                "end_time": time(22, 0),   # 10:00 PM
                "days_of_week": json.dumps(["monday", "tuesday", "wednesday", "thursday", "friday"]),
                "description": "Evening shift - 2 PM to 10 PM, Monday to Friday",
                "is_active": True
            },
            {
                "shift_name": "Night Shift",
                "start_time": time(22, 0), # 10:00 PM
                "end_time": time(6, 0),    # 6:00 AM
                "days_of_week": json.dumps(["sunday", "monday", "tuesday", "wednesday", "thursday"]),
                "description": "Night shift - 10 PM to 6 AM, Sunday to Thursday",
                "is_active": True
            },
            {
                "shift_name": "Weekend Shift",
                "start_time": time(10, 0), # 10:00 AM
                "end_time": time(18, 0),   # 6:00 PM
                "days_of_week": json.dumps(["saturday", "sunday"]),
                "description": "Weekend shift - 10 AM to 6 PM, Saturday and Sunday",
                "is_active": True
            }
        ]
        
        created_shifts = []
        for shift_data in predefined_shifts:
            # Check if this shift template already exists
            existing = self.db.query(Shift).filter(
                and_(
                    Shift.shift_name == shift_data["shift_name"],
                    Shift.employee_id == None  # Template shifts have no employee
                )
            ).first()
            
            if not existing:
                shift = Shift(**shift_data)
                self.db.add(shift)
                created_shifts.append(shift)
        
        if created_shifts:
            self.db.commit()
            for shift in created_shifts:
                self.db.refresh(shift)
        
        return created_shifts

    def get_all_shifts_including_templates(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all shifts including both assigned shifts and templates"""
        from app.models.employee import Employee
        
        # Query shifts with LEFT JOIN to employees to get employee data
        query = self.db.query(Shift, Employee).outerjoin(Employee, Shift.employee_id == Employee.id).filter(
            Shift.is_active == True
        ).offset(skip).limit(limit)
        
        result = []
        for shift, employee in query.all():
            # For assigned shifts (with employee_id)
            if shift.employee_id and employee:
                shift_dict = {
                    "id": shift.id,
                    "employee_id": shift.employee_id,
                    "employee_name": employee.name,
                    "employee_employee_id": employee.employee_id,
                    "shift_name": shift.shift_name,
                    "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
                    "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
                    "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
                    "description": shift.description,
                    "is_active": shift.is_active,
                    "created_at": shift.created_at,
                    "updated_at": shift.updated_at
                }
            else:
                # For templates (employee_id is None)
                shift_dict = {
                    "id": shift.id,
                    "employee_id": None,
                    "employee_name": "Template",
                    "employee_employee_id": "TEMPLATE",
                    "shift_name": shift.shift_name,
                    "start_time": shift.start_time.strftime('%H:%M') if shift.start_time else None,
                    "end_time": shift.end_time.strftime('%H:%M') if shift.end_time else None,
                    "days_of_week": json.loads(shift.days_of_week) if shift.days_of_week else [],
                    "description": shift.description,
                    "is_active": shift.is_active,
                    "created_at": shift.created_at,
                    "updated_at": shift.updated_at
                }
            result.append(shift_dict)
        
        return result

    def get_shift_templates(self) -> List[dict]:
        """Get predefined shift templates"""
        templates = self.db.query(Shift).filter(Shift.employee_id == None).all()
        
        result = []
        for template in templates:
            template_dict = {
                "id": template.id,
                "employee_id": template.employee_id,  # Will be None for templates
                "shift_name": template.shift_name,
                "start_time": template.start_time.strftime('%H:%M') if template.start_time else None,
                "end_time": template.end_time.strftime('%H:%M') if template.end_time else None,
                "days_of_week": json.loads(template.days_of_week) if template.days_of_week else [],
                "description": template.description,
                "is_active": template.is_active
            }
            result.append(template_dict)
        
        return result

    def assign_shift_to_employee(self, employee_id: int, template_id: int) -> Optional[Shift]:
        """Assign a shift template to an employee"""
        template = self.get_shift_by_id(template_id)
        if not template:
            return None
        
        # Create new shift based on template
        shift_data = {
            "employee_id": employee_id,
            "shift_name": template.shift_name,
            "start_time": template.start_time,
            "end_time": template.end_time,
            "days_of_week": template.days_of_week,
            "description": template.description,
            "is_active": True
        }
        
        return self.create_shift(shift_data)
