@echo off
echo 🚀 Starting Attendance Management Backend Server...
echo.
echo 📡 Server will be available at: http://127.0.0.1:8001
echo 📚 API Documentation: http://127.0.0.1:8001/docs
echo 🔧 Face Recognition: http://127.0.0.1:8001/api/v1/face/detect-realtime
echo.
echo ⏳ Starting server...
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
