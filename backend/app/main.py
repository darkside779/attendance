from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Attendance Management System",
    description="Facial Recognition Based Attendance System with Role-Based Access Control",
    version="1.0.0"
)

# Configure CORS - EXPLICIT ALLOW ALL for development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080", 
    "http://127.0.0.1:8080",
    "*"
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

@app.get("/")
async def root():
    return {"message": "Attendance Management System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

@app.get("/test-cors")
async def test_cors():
    return {"message": "CORS is working!", "timestamp": "2025-10-11T19:39:00"}

# Include routers
from app.routes import auth, employees, attendance, face_recognition, reports, payroll, shifts

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["employees"])
app.include_router(face_recognition.router, prefix="/api/v1/face", tags=["face-recognition"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["attendance"])
app.include_router(payroll.router, prefix="/api/v1/payroll", tags=["payroll"])
app.include_router(shifts.router, prefix="/api/v1/shifts", tags=["shifts"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
