"""
Application configuration settings
"""
import os
from typing import List

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Allow access from different devices on the network
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        # Add your PC's IP address for network access
        "http://192.168.1.196:3000",
    ]
    
    # For development, allow all origins (less secure but more flexible)
    ALLOW_ALL_ORIGINS: bool = True  # Set to False in production
    
    # Debug
    DEBUG: bool = True

settings = Settings()
