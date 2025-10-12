"""
Production configuration settings for Render deployment
"""
import os
from typing import List

class Settings:
    # Database - Use PostgreSQL on Render
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production-render")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Add your frontend domain
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://your-frontend-domain.netlify.app",  # Replace with your actual frontend URL
        "https://your-frontend-domain.vercel.app",   # Replace with your actual frontend URL
    ]
    
    # Production settings
    DEBUG: bool = False
    
    # Render specific
    PORT: int = int(os.getenv("PORT", 10000))

settings = Settings()
