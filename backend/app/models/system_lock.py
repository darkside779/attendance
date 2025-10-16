"""
System Lock model for auto-locking the attendance system every 30 days
"""
from sqlalchemy import Column, Integer, DateTime, Boolean, String, Text
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime, timedelta

class SystemLock(Base):
    __tablename__ = "system_locks"
    
    id = Column(Integer, primary_key=True, index=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    locked_at = Column(DateTime, nullable=True)
    unlocked_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    lock_reason = Column(String(255), default="30-day automatic lock")
    unlock_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    @classmethod
    def get_current_lock(cls, db):
        """Get the current active system lock"""
        return db.query(cls).order_by(cls.id.desc()).first()
    
    @classmethod
    def is_system_locked(cls, db):
        """Check if the system is currently locked"""
        current_lock = cls.get_current_lock(db)
        if not current_lock:
            return False
        
        now = datetime.utcnow()
        # System is locked if:
        # 1. is_locked is True, OR
        # 2. Current time has passed the expires_at time
        return current_lock.is_locked or now >= current_lock.expires_at
    
    @classmethod
    def create_initial_lock(cls, db):
        """Create the initial system lock with 30-day expiration"""
        now = datetime.utcnow()
        expires_at = now + timedelta(days=30)
        
        lock = cls(
            is_locked=False,
            expires_at=expires_at,
            lock_reason="Initial 30-day license period"
        )
        db.add(lock)
        db.commit()
        return lock
    
    def extend_license(self, db):
        """Extend the license for another 30 days"""
        now = datetime.utcnow()
        self.expires_at = now + timedelta(days=30)
        self.is_locked = False
        self.unlocked_at = now
        self.unlock_attempts = 0
        db.commit()
        return self
    
    def lock_system(self, db, reason="30-day period expired"):
        """Lock the system"""
        self.is_locked = True
        self.locked_at = datetime.utcnow()
        self.lock_reason = reason
        db.commit()
        return self
    
    def increment_unlock_attempts(self, db):
        """Increment failed unlock attempts"""
        self.unlock_attempts += 1
        db.commit()
        return self
