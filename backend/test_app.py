"""
Simple test to verify FastAPI setup without complex dependencies
"""
from fastapi import FastAPI

app = FastAPI(
    title="Attendance Management System",
    description="Facial Recognition Based Attendance System",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Attendance Management System API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

@app.get("/test")
async def test_endpoint():
    return {"message": "Test endpoint working", "data": {"users": [], "employees": []}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
