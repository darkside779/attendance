"""
Setup script to create accounting user
"""
from app.core.database import SessionLocal
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.models.user import UserRole

def create_accounting_user():
    """Create an accounting user for testing"""
    db = SessionLocal()
    try:
        user_service = UserService(db)
        
        # Check if accounting user already exists
        existing_user = user_service.get_user_by_username("accounting")
        if existing_user:
            print("✅ Accounting user already exists")
            print(f"   Username: {existing_user.username}")
            print(f"   Role: {existing_user.role}")
            return existing_user
        
        # Create accounting user
        print("Creating accounting user...")
        accounting_user_data = UserCreate(
            username="accounting",
            email="accounting@company.com",
            password="accounting123",  # Change this to a secure password
            role=UserRole.ACCOUNTING
        )
        
        new_user = user_service.create_user(accounting_user_data)
        print("✅ Accounting user created successfully!")
        print(f"   Username: {new_user.username}")
        print(f"   Email: {new_user.email}")
        print(f"   Role: {new_user.role}")
        print(f"   Password: accounting123")
        
        return new_user
        
    except Exception as e:
        print(f"❌ Error creating accounting user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    print("🧾 Setting up Accounting User...")
    create_accounting_user()
    print("\n📋 Accounting user setup completed!")
    print("\n🎯 Accounting user has access to:")
    print("   - Employee Management")
    print("   - Attendance Tracker") 
    print("   - Reports & Analytics")
    print("   - Payroll Management")
