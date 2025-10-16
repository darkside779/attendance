"""
System Lock Service for managing 30-day auto-lock functionality
"""
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.system_lock import SystemLock

class SystemLockService:
    def __init__(self, db: Session):
        self.db = db
        # The unlock password (hashed for security)
        self.unlock_password_hash = self._hash_password("")
    
    def _hash_password(self, password: str) -> str:
        """Hash the password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def initialize_system(self):
        """Initialize the system lock on first run"""
        current_lock = SystemLock.get_current_lock(self.db)
        if not current_lock:
            return SystemLock.create_initial_lock(self.db)
        return current_lock
    
    def check_system_status(self) -> dict:
        """Check if the system is locked and return status"""
        current_lock = SystemLock.get_current_lock(self.db)
        
        if not current_lock:
            # No lock exists, create initial one
            current_lock = self.initialize_system()
        
        now = datetime.utcnow()
        is_locked = SystemLock.is_system_locked(self.db)
        
        # Auto-lock if expired but not manually locked yet
        if not current_lock.is_locked and now >= current_lock.expires_at:
            current_lock.lock_system(self.db, "30-day period expired - auto-locked")
            is_locked = True
        
        days_remaining = 0
        if not is_locked:
            days_remaining = max(0, (current_lock.expires_at - now).days)
        
        return {
            "is_locked": is_locked,
            "locked_at": current_lock.locked_at.isoformat() if current_lock.locked_at else None,
            "expires_at": current_lock.expires_at.isoformat(),
            "days_remaining": days_remaining,
            "lock_reason": current_lock.lock_reason,
            "unlock_attempts": current_lock.unlock_attempts
        }
    
    def unlock_system(self, password: str) -> dict:
        """Attempt to unlock the system with password"""
        current_lock = SystemLock.get_current_lock(self.db)
        
        if not current_lock:
            return {"success": False, "message": "No lock found"}
        
        # Check password
        password_hash = self._hash_password(password)
        if password_hash != self.unlock_password_hash:
            current_lock.increment_unlock_attempts(self.db)
            return {
                "success": False, 
                "message": "Invalid password",
                "attempts": current_lock.unlock_attempts
            }
        
        # Password correct - extend license for 30 days
        current_lock.extend_license(self.db)
        
        return {
            "success": True,
            "message": "System unlocked successfully! License extended for 30 days.",
            "expires_at": current_lock.expires_at.isoformat(),
            "days_remaining": 30
        }
    
    def get_license_info(self) -> dict:
        """Get current license information"""
        current_lock = SystemLock.get_current_lock(self.db)
        
        if not current_lock:
            current_lock = self.initialize_system()
        
        now = datetime.utcnow()
        days_remaining = max(0, (current_lock.expires_at - now).days)
        hours_remaining = max(0, (current_lock.expires_at - now).total_seconds() / 3600)
        
        return {
            "expires_at": current_lock.expires_at.isoformat(),
            "days_remaining": days_remaining,
            "hours_remaining": int(hours_remaining),
            "is_locked": SystemLock.is_system_locked(self.db),
            "created_at": current_lock.created_at.isoformat() if current_lock.created_at else None
        }
    
    def force_lock_system(self, reason: str = "Manual lock") -> dict:
        """Manually lock the system (admin function)"""
        current_lock = SystemLock.get_current_lock(self.db)
        
        if not current_lock:
            current_lock = self.initialize_system()
        
        current_lock.lock_system(self.db, reason)
        
        return {
            "success": True,
            "message": f"System locked: {reason}",
            "locked_at": current_lock.locked_at.isoformat()
        }
