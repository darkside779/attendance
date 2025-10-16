"""
Setup script to create system lock table and initialize the system
"""
from app.core.database import engine, SessionLocal, Base
from app.models.system_lock import SystemLock

def create_system_lock_table():
    """Create the system_locks table"""
    print("Creating system_locks table...")
    
    # Import all models to ensure they're registered
    from app.models import employee, attendance, user, payroll, shift, system_lock
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ System lock table created successfully!")

def initialize_system_lock():
    """Initialize the first system lock"""
    db = SessionLocal()
    try:
        # Check if system lock already exists
        existing_lock = SystemLock.get_current_lock(db)
        if existing_lock:
            print("✅ System lock already exists")
            print(f"   Expires at: {existing_lock.expires_at}")
            print(f"   Is locked: {existing_lock.is_locked}")
            return existing_lock
        
        # Create initial system lock
        print("Creating initial system lock...")
        lock = SystemLock.create_initial_lock(db)
        print("✅ Initial system lock created!")
        print(f"   Expires at: {lock.expires_at}")
        print(f"   License period: 30 days")
        return lock
        
    finally:
        db.close()

if __name__ == "__main__":
    print("🔒 Setting up System Lock...")
    create_system_lock_table()
    initialize_system_lock()
    print("🎉 System Lock setup completed!")
    print("\n📋 System will auto-lock every 30 days")

