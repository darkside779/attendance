"""
Payroll service for salary calculations and payroll management
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.payroll import PayrollPeriod, PayrollRecord, SalaryRule, PayrollAudit

class PayrollService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_payroll_period(self, name: str, start_date: date, end_date: date, created_by: int) -> PayrollPeriod:
        """Create a new payroll period"""
        period = PayrollPeriod(
            name=name,
            start_date=start_date,
            end_date=end_date,
            created_by=created_by
        )
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period
    
    def calculate_employee_payroll(self, employee_id: int, period_id: int) -> PayrollRecord:
        """Calculate payroll for a specific employee and period"""
        
        # Get employee and period
        employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.id == period_id).first()
        
        if not employee or not period:
            raise ValueError("Employee or period not found")
        
        # Get attendance records for the period
        attendance_records = self.db.query(Attendance).filter(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.date >= period.start_date,
                Attendance.date <= period.end_date
            )
        ).all()
        
        # Calculate work statistics
        work_stats = self._calculate_work_statistics(attendance_records)
        
        # Get or create payroll record
        payroll_record = self.db.query(PayrollRecord).filter(
            and_(
                PayrollRecord.employee_id == employee_id,
                PayrollRecord.period_id == period_id
            )
        ).first()
        
        if not payroll_record:
            payroll_record = PayrollRecord(
                employee_id=employee_id,
                period_id=period_id
            )
            self.db.add(payroll_record)
        
        # Update work statistics
        payroll_record.total_hours = work_stats['total_hours']
        payroll_record.regular_hours = work_stats['regular_hours']
        payroll_record.overtime_hours = work_stats['overtime_hours']
        payroll_record.days_worked = work_stats['days_worked']
        payroll_record.days_absent = work_stats['days_absent']
        payroll_record.days_late = work_stats['days_late']
        
        # Calculate salary
        payroll_record.base_salary = employee.salary_rate or 0.0
        payroll_record.hourly_rate = self._calculate_hourly_rate(employee.salary_rate)
        
        # Apply salary rules
        self._apply_salary_rules(payroll_record, employee)
        
        # Calculate final amounts
        payroll_record.gross_salary = (
            payroll_record.regular_pay + 
            payroll_record.overtime_pay + 
            payroll_record.bonus
        )
        
        payroll_record.total_deductions = (
            payroll_record.tax_deduction +
            payroll_record.insurance_deduction +
            payroll_record.other_deductions +
            payroll_record.late_penalty +
            payroll_record.absence_deduction
        )
        
        payroll_record.net_salary = payroll_record.gross_salary - payroll_record.total_deductions
        payroll_record.calculated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(payroll_record)
        return payroll_record
    
    def calculate_period_payroll(self, period_id: int) -> List[PayrollRecord]:
        """Calculate payroll for all employees in a period"""
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.id == period_id).first()
        if not period:
            raise ValueError("Period not found")
        
        # Get all active employees
        employees = self.db.query(Employee).filter(Employee.is_active == "true").all()
        
        payroll_records = []
        for employee in employees:
            try:
                record = self.calculate_employee_payroll(employee.id, period_id)
                payroll_records.append(record)
            except Exception as e:
                print(f"Error calculating payroll for employee {employee.id}: {e}")
                continue
        
        # Update period status
        period.status = "completed"
        self.db.commit()
        
        return payroll_records
    
    def _calculate_work_statistics(self, attendance_records: List[Attendance]) -> Dict:
        """Calculate work statistics from attendance records"""
        total_hours = 0.0
        days_worked = 0
        days_absent = 0
        days_late = 0
        
        for record in attendance_records:
            if record.check_in:
                days_worked += 1
                if record.total_hours:
                    total_hours += record.total_hours
                
                # Check if late (assuming work starts at 9:00 AM)
                if record.check_in.time() > datetime.strptime("09:00", "%H:%M").time():
                    days_late += 1
            else:
                days_absent += 1
        
        # Calculate regular and overtime hours (assuming 8 hours/day standard)
        standard_hours_per_day = 8.0
        expected_days = len(attendance_records) if attendance_records else 0
        expected_total_hours = expected_days * standard_hours_per_day
        
        regular_hours = min(total_hours, expected_total_hours)
        overtime_hours = max(0, total_hours - expected_total_hours)
        
        return {
            'total_hours': total_hours,
            'regular_hours': regular_hours,
            'overtime_hours': overtime_hours,
            'days_worked': days_worked,
            'days_absent': days_absent,
            'days_late': days_late
        }
    
    def _calculate_hourly_rate(self, monthly_salary: float) -> float:
        """Calculate hourly rate from monthly salary (assuming 160 hours/month)"""
        if not monthly_salary:
            return 0.0
        return monthly_salary / 160.0  # 20 days * 8 hours
    
    def _apply_salary_rules(self, payroll_record: PayrollRecord, employee: Employee):
        """Apply salary calculation rules"""
        
        # Get active salary rules
        rules = self.db.query(SalaryRule).filter(SalaryRule.is_active == True).all()
        
        for rule in rules:
            # Check if rule applies to this employee
            if not self._rule_applies_to_employee(rule, employee):
                continue
            
            if rule.rule_type == "overtime":
                self._apply_overtime_rule(rule, payroll_record)
            elif rule.rule_type == "tax":
                self._apply_tax_rule(rule, payroll_record)
            elif rule.rule_type == "bonus":
                self._apply_bonus_rule(rule, payroll_record)
            elif rule.rule_type == "deduction":
                self._apply_deduction_rule(rule, payroll_record)
    
    def _rule_applies_to_employee(self, rule: SalaryRule, employee: Employee) -> bool:
        """Check if a salary rule applies to an employee"""
        if rule.applies_to_all:
            return True
        
        if rule.department_filter and employee.department != rule.department_filter:
            return False
        
        if rule.position_filter and employee.position != rule.position_filter:
            return False
        
        return True
    
    def _apply_overtime_rule(self, rule: SalaryRule, payroll_record: PayrollRecord):
        """Apply overtime calculation rule"""
        if payroll_record.overtime_hours > 0:
            overtime_rate = payroll_record.hourly_rate * (rule.rate_multiplier or 1.5)
            payroll_record.overtime_pay = payroll_record.overtime_hours * overtime_rate
        
        # Calculate regular pay
        payroll_record.regular_pay = payroll_record.regular_hours * payroll_record.hourly_rate
    
    def _apply_tax_rule(self, rule: SalaryRule, payroll_record: PayrollRecord):
        """Apply tax deduction rule"""
        if rule.percentage:
            gross_before_tax = payroll_record.regular_pay + payroll_record.overtime_pay + payroll_record.bonus
            payroll_record.tax_deduction = gross_before_tax * (rule.percentage / 100)
        elif rule.fixed_amount:
            payroll_record.tax_deduction = rule.fixed_amount
    
    def _apply_bonus_rule(self, rule: SalaryRule, payroll_record: PayrollRecord):
        """Apply bonus rule"""
        if rule.fixed_amount:
            payroll_record.bonus += rule.fixed_amount
        elif rule.percentage:
            base_amount = payroll_record.regular_pay + payroll_record.overtime_pay
            payroll_record.bonus += base_amount * (rule.percentage / 100)
    
    def _apply_deduction_rule(self, rule: SalaryRule, payroll_record: PayrollRecord):
        """Apply deduction rule"""
        if rule.fixed_amount:
            payroll_record.other_deductions += rule.fixed_amount
        elif rule.percentage:
            base_amount = payroll_record.regular_pay + payroll_record.overtime_pay
            payroll_record.other_deductions += base_amount * (rule.percentage / 100)
        
        # Apply late penalties
        if payroll_record.days_late > 0:
            payroll_record.late_penalty = payroll_record.days_late * (rule.fixed_amount or 0)
        
        # Apply absence deductions
        if payroll_record.days_absent > 0:
            daily_rate = payroll_record.hourly_rate * 8  # 8 hours per day
            payroll_record.absence_deduction = payroll_record.days_absent * daily_rate
    
    def get_payroll_summary(self, period_id: int) -> Dict:
        """Get payroll summary for a period"""
        records = self.db.query(PayrollRecord).filter(PayrollRecord.period_id == period_id).all()
        
        if not records:
            return {
                'total_employees': 0,
                'total_gross_salary': 0.0,
                'total_deductions': 0.0,
                'total_net_salary': 0.0,
                'average_hours': 0.0,
                'total_overtime_hours': 0.0
            }
        
        return {
            'total_employees': len(records),
            'total_gross_salary': sum(r.gross_salary for r in records),
            'total_deductions': sum(r.total_deductions for r in records),
            'total_net_salary': sum(r.net_salary for r in records),
            'average_hours': sum(r.total_hours for r in records) / len(records),
            'total_overtime_hours': sum(r.overtime_hours for r in records)
        }
    
    def approve_payroll(self, payroll_record_id: int, approved_by: int) -> PayrollRecord:
        """Approve a payroll record"""
        record = self.db.query(PayrollRecord).filter(PayrollRecord.id == payroll_record_id).first()
        if not record:
            raise ValueError("Payroll record not found")
        
        record.status = "approved"
        record.approved_by = approved_by
        record.approved_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(record)
        return record
