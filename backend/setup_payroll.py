#!/usr/bin/env python3
"""
Setup initial payroll period and calculate payroll for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime
from app.core.database import SessionLocal
from app.models.payroll import PayrollPeriod
from app.models.user import User
from app.services.payroll_service import PayrollService

def setup_payroll():
    db = SessionLocal()
    
    try:
        print("🏗️ Setting up payroll system...")
        
        # Check if payroll periods already exist
        existing_periods = db.query(PayrollPeriod).count()
        if existing_periods > 0:
            print(f"ℹ️ {existing_periods} payroll periods already exist")
            return
        
        # Get admin user (assuming ID 1 exists)
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("❌ Admin user not found")
            return
        
        # Create payroll service
        payroll_service = PayrollService(db)
        
        # Create October 2025 payroll period
        print("📅 Creating October 2025 payroll period...")
        period = payroll_service.create_payroll_period(
            name="October 2025",
            start_date=date(2025, 10, 1),
            end_date=date(2025, 10, 31),
            created_by=admin_user.id
        )
        print(f"✅ Created payroll period: {period.name} (ID: {period.id})")
        
        # Calculate payroll for all employees
        print("💰 Calculating payroll for all employees...")
        try:
            records = payroll_service.calculate_period_payroll(period.id)
            print(f"✅ Payroll calculated for {len(records)} employees")
            
            # Show summary
            for record in records:
                print(f"  - Employee {record.employee_id}: ${record.net_salary:.2f} net salary")
                
        except Exception as e:
            print(f"⚠️ Error calculating payroll: {e}")
            print("ℹ️ This is normal if employees don't have salary rates set")
        
        print("🎉 Payroll setup completed!")
        
    except Exception as e:
        print(f"❌ Error setting up payroll: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_payroll()
