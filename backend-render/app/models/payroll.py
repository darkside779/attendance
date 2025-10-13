"""
Payroll models for salary calculation and management
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class PayrollPeriod(Base):
    """Payroll period model for managing salary calculation periods"""
    __tablename__ = "payroll_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "October 2025", "Q4 2025"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default="draft")  # draft, processing, completed, paid
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    payroll_records = relationship("PayrollRecord", back_populates="period")
    creator = relationship("User")

class PayrollRecord(Base):
    """Individual employee payroll record"""
    __tablename__ = "payroll_records"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    period_id = Column(Integer, ForeignKey("payroll_periods.id"), nullable=False)
    
    # Work hours
    total_hours = Column(Float, default=0.0)
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    days_worked = Column(Integer, default=0)
    days_absent = Column(Integer, default=0)
    days_late = Column(Integer, default=0)
    
    # Salary calculations
    base_salary = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    regular_pay = Column(Float, default=0.0)
    overtime_pay = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    
    # Deductions
    tax_deduction = Column(Float, default=0.0)
    insurance_deduction = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    late_penalty = Column(Float, default=0.0)
    absence_deduction = Column(Float, default=0.0)
    
    # Final amounts
    gross_salary = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    
    # Status and notes
    status = Column(String(20), default="calculated")  # calculated, approved, paid
    notes = Column(Text)
    calculated_at = Column(DateTime, server_default=func.now())
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    paid_at = Column(DateTime)
    
    # Relationships
    employee = relationship("Employee")
    period = relationship("PayrollPeriod", back_populates="payroll_records")
    approver = relationship("User")

class SalaryRule(Base):
    """Configurable salary calculation rules"""
    __tablename__ = "salary_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # overtime, tax, bonus, deduction
    
    # Rule parameters
    threshold_hours = Column(Float)  # e.g., 40 hours for overtime
    rate_multiplier = Column(Float)  # e.g., 1.5 for overtime
    fixed_amount = Column(Float)  # Fixed bonus/deduction amount
    percentage = Column(Float)  # Percentage-based calculation
    
    # Conditions
    applies_to_all = Column(Boolean, default=True)
    department_filter = Column(String(100))
    position_filter = Column(String(100))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class PayrollAudit(Base):
    """Audit trail for payroll changes"""
    __tablename__ = "payroll_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    payroll_record_id = Column(Integer, ForeignKey("payroll_records.id"))
    field_name = Column(String(50), nullable=False)
    old_value = Column(String(255))
    new_value = Column(String(255))
    reason = Column(Text)
    changed_by = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    payroll_record = relationship("PayrollRecord")
    user = relationship("User")
