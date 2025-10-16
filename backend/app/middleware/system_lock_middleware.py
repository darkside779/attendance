"""
Middleware to check system lock status on every request
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.system_lock_service import SystemLockService

class SystemLockMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Skip lock check for certain endpoints
            if self._should_skip_lock_check(request.url.path):
                await self.app(scope, receive, send)
                return
            
            # Check system lock status
            db = SessionLocal()
            try:
                lock_service = SystemLockService(db)
                status_info = lock_service.check_system_status()
                
                if status_info["is_locked"]:
                    # System is locked, return lock status
                    response = JSONResponse(
                        status_code=423,  # HTTP 423 Locked
                        content={
                            "detail": "System is locked",
                            "lock_info": status_info,
                            "message": f"System locked: {status_info['lock_reason']}. Please contact administrator."
                        }
                    )
                    await response(scope, receive, send)
                    return
                    
            except Exception as e:
                # If there's an error checking lock status, log it but don't block
                print(f"Error checking system lock: {e}")
            finally:
                db.close()
        
        # System is not locked, proceed normally
        await self.app(scope, receive, send)
    
    def _should_skip_lock_check(self, path: str) -> bool:
        """Determine if lock check should be skipped for this path"""
        skip_paths = [
            "/api/v1/system-lock/status",
            "/api/v1/system-lock/unlock",
            "/api/v1/system-lock/license-info",
            "/health",
            "/",
            "/docs",
            "/openapi.json",
            "/favicon.ico"
        ]
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)
