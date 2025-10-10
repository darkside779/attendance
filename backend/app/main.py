from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="Attendance Management System",
    description="Facial Recognition Based Attendance System with Role-Based Access Control",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Attendance Management System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Include routers
from app.routes import auth, employees, face_recognition, attendance

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["employees"])
app.include_router(face_recognition.router, prefix="/api/v1/face", tags=["face-recognition"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["attendance"])
