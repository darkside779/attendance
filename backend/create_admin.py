"""
Script to create the first admin user
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.models.user import UserRole

def create_admin_user():
    """Create the first admin user"""
    db = SessionLocal()
    try:
        user_service = UserService(db)
        
        # Check if admin already exists
        admin_user = user_service.get_user_by_username("admin")
        if admin_user:
            print("Admin user already exists!")
            print(f"Username: {admin_user.username}")
            print(f"Role: {admin_user.role}")
            return
        
        # Create admin user
        admin_data = UserCreate(
            username="admin",
            email="admin@attendance.com",
            password="admin123"[:72],  # Truncate password to 72 bytes for bcrypt
            role=UserRole.ADMIN
        )
        
        new_admin = user_service.create_user(admin_data)
        print("SUCCESS: Admin user created successfully!")
        print(f"Username: {new_admin.username}")
        print(f"Email: {new_admin.email}")
        print(f"Role: {new_admin.role}")
        print(f"Password: admin123 (Please change this!)")
        
    except Exception as e:
        print(f"ERROR: Failed to create admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating admin user...")
    create_admin_user()
