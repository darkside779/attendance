"""
Application configuration settings - Optimized for Render deployment
"""
import os
from typing import List

class Settings:
    # Environment detection
    ENVIRONMENT: str = os.getenv("RENDER", "local")
    
    # Database - Render provides PostgreSQL URL automatically
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
    
    # Security - Use strong secret key in production
    SECRET_KEY: str = os.getenv("SECRET_KEY", "render-production-secret-key-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS - Allow frontend domains
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://attendance-eo6b.onrender.com",  # Your Render backend
        "*"  # Allow all for now
    ]
    
    # Debug - Disable in production
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Render specific settings
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

settings = Settings()
