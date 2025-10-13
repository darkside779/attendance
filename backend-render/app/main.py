from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import logging
import os

# Configure logging for Render
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Get environment info for Render
ENVIRONMENT = os.getenv("RENDER", "local")
PORT = os.getenv("PORT", "8000")

app = FastAPI(
    title="Attendance Management System",
    description="Facial Recognition Based Attendance System with Role-Based Access Control",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "local" else "/docs",  # Keep docs available
    redoc_url="/redoc" if ENVIRONMENT == "local" else "/redoc"
)

# Configure CORS for Render deployment
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080", 
    "http://127.0.0.1:8080",
    "https://attendance-eo6b.onrender.com",  # Your Render backend URL
    "*"  # Allow all origins for now (can be restricted later)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Log CORS configuration
logging.info(f"🔧 CORS configured for origins: {origins}")
logging.info("✅ CORS middleware added successfully")
logging.info(f"🚀 Running in {ENVIRONMENT} environment on port {PORT}")

@app.get("/")
async def root():
    return {
        "message": "Attendance Management System API", 
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "message": "API is running",
        "environment": ENVIRONMENT,
        "port": PORT
    }

@app.get("/api/v1/health")
async def api_health_check():
    """Health check endpoint for API monitoring"""
    return {
        "status": "healthy",
        "api_version": "v1",
        "environment": ENVIRONMENT,
        "database": "connected" if settings.DATABASE_URL else "not configured"
    }

# Include routers
from app.routes import auth, employees, attendance, face_recognition, reports, payroll, shifts

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["employees"])
app.include_router(face_recognition.router, prefix="/api/v1/face", tags=["face-recognition"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["attendance"])
app.include_router(payroll.router, prefix="/api/v1/payroll", tags=["payroll"])
app.include_router(shifts.router, prefix="/api/v1/shifts", tags=["shifts"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])

# Startup and shutdown events for Render
@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logging.info("🚀 Attendance Management System starting up...")
    logging.info(f"📊 Environment: {ENVIRONMENT}")
    logging.info(f"🔗 Database URL configured: {'Yes' if settings.DATABASE_URL else 'No'}")
    logging.info("✅ Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logging.info("🛑 Attendance Management System shutting down...")
    logging.info("✅ Application shutdown complete")
