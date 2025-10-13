# Attendance System Backend - Render Deployment

This is the backend configured for deployment on Render.com

## Render Configuration

### Build Command
```bash
./render-build.sh
```

### Start Command
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
```

### Environment Variables (Set in Render Dashboard)
- `DATABASE_URL`: PostgreSQL connection string from Render
- `SECRET_KEY`: Your secret key for JWT tokens
- `TZ`: Asia/Dubai (for correct timezone)

### Files for Render
- `render-build.sh`: Build script that installs dependencies and runs migrations
- `runtime.txt`: Specifies Python version (3.11.9)
- `requirements.txt`: Python dependencies
- `alembic/`: Database migration files

### Deployment Steps
1. Push this backend-render folder to your GitHub repository
2. Connect the repository to Render
3. Set the build command: `./render-build.sh`
4. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
5. Add environment variables in Render dashboard
6. Deploy!

### Database
- **SQLite Fallback**: Uses SQLite database (`attendance.db`) if PostgreSQL is not available
- **Auto-Detection**: Automatically detects and fixes malformed DATABASE_URL from Render
- **Data Included**: Contains existing employee and attendance data
- **PostgreSQL Ready**: Will automatically use PostgreSQL when proper `DATABASE_URL` is provided

### Database Error Fix
The system now handles the common Render issue where `DATABASE_URL` contains HTTP URLs instead of proper database connection strings. It automatically falls back to SQLite with your existing data.
