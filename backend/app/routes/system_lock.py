"""
System Lock API routes for managing 30-day auto-lock functionality
"""
from fastapi import APIRouter, Depends, HTTPException
from starlette import status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.services.system_lock_service import SystemLockService

router = APIRouter()

class UnlockRequest(BaseModel):
    password: str

from typing import Optional

class LockResponse(BaseModel):
    is_locked: bool
    locked_at: Optional[str] = None
    expires_at: str
    days_remaining: int
    lock_reason: Optional[str] = None
    unlock_attempts: int = 0

class UnlockResponse(BaseModel):
    success: bool
    message: str
    expires_at: Optional[str] = None
    days_remaining: int = 0
    attempts: int = 0

@router.get("/status", response_model=LockResponse)
async def get_system_status(db: Session = Depends(get_db)):
    """Get current system lock status"""
    try:
        lock_service = SystemLockService(db)
        status = lock_service.check_system_status()
        return LockResponse(**status)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking system status: {str(e)}"
        )

@router.post("/unlock", response_model=UnlockResponse)
async def unlock_system(request: UnlockRequest, db: Session = Depends(get_db)):
    """Unlock the system with password"""
    try:
        lock_service = SystemLockService(db)
        result = lock_service.unlock_system(request.password)
        
        if not result["success"]:
            # Return the error but don't raise HTTP exception for wrong password
            return UnlockResponse(
                success=False,
                message=result["message"],
                attempts=result.get("attempts", 0)
            )
        
        return UnlockResponse(
            success=True,
            message=result["message"],
            expires_at=result["expires_at"],
            days_remaining=result["days_remaining"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlocking system: {str(e)}"
        )

@router.get("/license-info")
async def get_license_info(db: Session = Depends(get_db)):
    """Get current license information"""
    try:
        lock_service = SystemLockService(db)
        info = lock_service.get_license_info()
        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting license info: {str(e)}"
        )

@router.post("/force-lock")
async def force_lock_system(reason: str = "Manual lock", db: Session = Depends(get_db)):
    """Manually lock the system (admin function)"""
    try:
        lock_service = SystemLockService(db)
        result = lock_service.force_lock_system(reason)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error locking system: {str(e)}"
        )
