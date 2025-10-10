# Facial Recognition Attendance System

A comprehensive attendance management system using facial recognition technology with role-based access control for Admin and Accounting users.

## Features

- **Facial Recognition**: Automated check-in/check-out using face detection
- **Role-Based Access**: Admin and Accounting user roles with different permissions
- **Employee Management**: Complete CRUD operations for employee data
- **Shift Management**: Flexible shift assignment and scheduling
- **Salary Calculation**: Automated payroll based on working hours
- **Reports & Analytics**: Comprehensive reporting with PDF/Excel export
- **Real-time Dashboard**: Live attendance tracking and statistics

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: MySQL
- **Face Recognition**: OpenCV + face_recognition
- **Authentication**: JWT tokens
- **ORM**: SQLAlchemy

### Frontend
- **Framework**: React.js
- **UI Library**: Material-UI
- **State Management**: Redux Toolkit
- **Charts**: Chart.js

## Project Structure

```
attendance/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuration and utilities
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── store/         # Redux store
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### Backend Setup
1. Create virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp ../.env.example .env
   # Edit .env with your database credentials
   ```

4. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

### Database Setup
1. Create MySQL database:
   ```sql
   CREATE DATABASE attendance_db;
   ```

2. Run migrations (after implementing models):
   ```bash
   alembic upgrade head
   ```

## Development Status

- [x] Project structure created
- [ ] Database models
- [ ] Authentication system
- [ ] Face recognition setup
- [ ] Employee management
- [ ] Attendance tracking
- [ ] Salary calculation
- [ ] Reports generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
