"""
Payroll management routes for salary calculation and payroll processing
"""
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.payroll import PayrollPeriod, PayrollRecord, SalaryRule
from app.services.payroll_service import PayrollService
from app.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class PayrollPeriodCreate(BaseModel):
    name: str
    start_date: date
    end_date: date

class PayrollPeriodResponse(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    status: str = "draft"  # Default value
    created_at: datetime
    
    class Config:
        from_attributes = True

class PayrollRecordResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    period_id: int
    total_hours: float
    regular_hours: float
    overtime_hours: float
    days_worked: int
    days_absent: int
    days_late: int
    base_salary: float
    hourly_rate: float
    regular_pay: float
    overtime_pay: float
    bonus: float
    tax_deduction: float
    insurance_deduction: float
    other_deductions: float
    late_penalty: float
    absence_deduction: float
    gross_salary: float
    total_deductions: float
    net_salary: float
    status: str
    calculated_at: datetime
    
    class Config:
        from_attributes = True

class SalaryRuleCreate(BaseModel):
    name: str
    rule_type: str  # overtime, tax, bonus, deduction
    threshold_hours: Optional[float] = None
    rate_multiplier: Optional[float] = None
    fixed_amount: Optional[float] = None
    percentage: Optional[float] = None
    applies_to_all: bool = True
    department_filter: Optional[str] = None
    position_filter: Optional[str] = None

class PayrollSummaryResponse(BaseModel):
    total_employees: int
    total_gross_salary: float
    total_deductions: float
    total_net_salary: float
    average_hours: float
    total_overtime_hours: float

@router.post("/periods", response_model=PayrollPeriodResponse)
async def create_payroll_period(
    period_data: PayrollPeriodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new payroll period"""
    try:
        payroll_service = PayrollService(db)
        period = payroll_service.create_payroll_period(
            name=period_data.name,
            start_date=period_data.start_date,
            end_date=period_data.end_date,
            created_by=current_user.id
        )
        return period
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payroll period: {str(e)}"
        )

@router.get("/periods", response_model=List[PayrollPeriodResponse])
async def get_payroll_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payroll periods"""
    periods = db.query(PayrollPeriod).offset(skip).limit(limit).all()
    return periods

@router.get("/periods/{period_id}", response_model=PayrollPeriodResponse)
async def get_payroll_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific payroll period"""
    period = db.query(PayrollPeriod).filter(PayrollPeriod.id == period_id).first()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll period not found"
        )
    return period

@router.post("/periods/{period_id}/calculate")
async def calculate_period_payroll(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate payroll for all employees in a period"""
    try:
        payroll_service = PayrollService(db)
        records = payroll_service.calculate_period_payroll(period_id)
        return {
            "message": f"Payroll calculated for {len(records)} employees",
            "records_count": len(records)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating payroll: {str(e)}"
        )

@router.post("/employees/{employee_id}/periods/{period_id}/calculate")
async def calculate_employee_payroll(
    employee_id: int,
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate payroll for a specific employee"""
    try:
        payroll_service = PayrollService(db)
        record = payroll_service.calculate_employee_payroll(employee_id, period_id)
        return {
            "message": "Payroll calculated successfully",
            "payroll_record_id": record.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating payroll: {str(e)}"
        )

@router.get("/periods/{period_id}/records", response_model=List[PayrollRecordResponse])
async def get_period_payroll_records(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payroll records for a period"""
    records = db.query(PayrollRecord).filter(PayrollRecord.period_id == period_id).all()
    
    # Add employee names to records
    result = []
    for record in records:
        record_dict = {
            "id": record.id,
            "employee_id": record.employee_id,
            "employee_name": record.employee.name if record.employee else "Unknown",
            "period_id": record.period_id,
            "total_hours": record.total_hours,
            "regular_hours": record.regular_hours,
            "overtime_hours": record.overtime_hours,
            "days_worked": record.days_worked,
            "days_absent": record.days_absent,
            "days_late": record.days_late,
            "base_salary": record.base_salary,
            "hourly_rate": record.hourly_rate,
            "regular_pay": record.regular_pay,
            "overtime_pay": record.overtime_pay,
            "bonus": record.bonus,
            "tax_deduction": record.tax_deduction,
            "insurance_deduction": record.insurance_deduction,
            "other_deductions": record.other_deductions,
            "late_penalty": record.late_penalty,
            "absence_deduction": record.absence_deduction,
            "gross_salary": record.gross_salary,
            "total_deductions": record.total_deductions,
            "net_salary": record.net_salary,
            "status": record.status,
            "calculated_at": record.calculated_at
        }
        result.append(record_dict)
    
    return result

@router.get("/periods/{period_id}/summary", response_model=PayrollSummaryResponse)
async def get_payroll_summary(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payroll summary for a period"""
    try:
        payroll_service = PayrollService(db)
        summary = payroll_service.get_payroll_summary(period_id)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting payroll summary: {str(e)}"
        )

@router.post("/records/{record_id}/approve")
async def approve_payroll_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a payroll record"""
    try:
        payroll_service = PayrollService(db)
        record = payroll_service.approve_payroll(record_id, current_user.id)
        return {
            "message": "Payroll record approved successfully",
            "record_id": record.id,
            "status": record.status
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving payroll: {str(e)}"
        )

@router.post("/salary-rules", response_model=dict)
async def create_salary_rule(
    rule_data: SalaryRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new salary calculation rule"""
    try:
        rule = SalaryRule(**rule_data.dict())
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return {
            "message": "Salary rule created successfully",
            "rule_id": rule.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating salary rule: {str(e)}"
        )

@router.get("/salary-rules")
async def get_salary_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all salary calculation rules"""
    rules = db.query(SalaryRule).filter(SalaryRule.is_active == True).all()
    return rules

@router.get("/employees/{employee_id}/payroll-history")
async def get_employee_payroll_history(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payroll history for a specific employee"""
    records = db.query(PayrollRecord).filter(PayrollRecord.employee_id == employee_id).all()
    
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "period_name": record.period.name if record.period else "Unknown",
            "period_start": record.period.start_date if record.period else None,
            "period_end": record.period.end_date if record.period else None,
            "total_hours": record.total_hours,
            "gross_salary": record.gross_salary,
            "net_salary": record.net_salary,
            "status": record.status,
            "calculated_at": record.calculated_at
        })
    
    return result
