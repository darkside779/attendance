#!/usr/bin/env python3
"""
Local development server for testing the Render backend configuration
"""
import uvicorn
import os

if __name__ == "__main__":
    # Set environment variables for local testing
    os.environ.setdefault("DATABASE_URL", "sqlite:///./attendance.db")
    os.environ.setdefault("SECRET_KEY", "local-development-secret-key")
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1
    )
