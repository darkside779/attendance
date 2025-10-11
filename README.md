# 🏢 Enterprise Attendance Management System

A comprehensive, production-ready attendance management system featuring facial recognition technology, shift management, payroll processing, and advanced analytics. Built with modern technologies and enterprise-grade security.

## ✨ Features

### 🎯 Core Functionality
- **🔍 Facial Recognition**: AI-powered automated check-in/check-out with high accuracy
- **👥 Employee Management**: Complete CRUD operations with face data management
- **🕐 Shift Management**: Flexible shift templates, assignments, and scheduling
- **💰 Payroll System**: Automated salary calculation with overtime, bonuses, and deductions
- **📊 Real-time Dashboard**: Live attendance tracking and comprehensive statistics
- **📈 Reports & Analytics**: Advanced reporting with export capabilities

### 🔐 Security & Access Control
- **🛡️ Role-Based Access**: Admin and Accounting roles with granular permissions
- **🔑 JWT Authentication**: Secure token-based authentication system
- **🔒 Data Protection**: Encrypted face encodings and secure data storage

### 🎨 User Experience
- **📱 Modern UI**: Beautiful, responsive Material-UI interface
- **⚡ Real-time Updates**: Live data synchronization across all components
- **🌐 Cross-platform**: Works on desktop, tablet, and mobile devices

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **Database**: SQLite/MySQL with SQLAlchemy ORM
- **Face Recognition**: OpenCV + face_recognition library
- **Authentication**: JWT tokens with bcrypt hashing
- **API Documentation**: Auto-generated Swagger/OpenAPI docs

### Frontend
- **Framework**: React.js 18+ with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios with interceptors
- **Charts & Visualization**: Chart.js integration

## 📁 Project Structure

```
attendance/
├──  backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── core/                  # Configuration & database setup
│   │   │   ├── config.py         # App configuration
│   │   │   ├── database.py       # Database connection
│   │   │   └── security.py       # Authentication utilities
│   │   ├── models/               # SQLAlchemy database models
│   │   │   ├── user.py          # User authentication model
│   │   │   ├── employee.py      # Employee data model
│   │   │   ├── attendance.py    # Attendance records model
│   │   │   ├── shift.py         # Shift management model
│   │   │   └── payroll.py       # Payroll calculation model
│   │   ├── routes/              # FastAPI route handlers
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── employees.py     # Employee management API
│   │   │   ├── attendance.py    # Attendance tracking API
│   │   │   ├── shifts.py        # Shift management API
│   │   │   ├── payroll.py       # Payroll processing API
│   │   │   ├── face_recognition.py # Face recognition API
│   │   │   └── reports.py       # Reports generation API
│   │   ├── services/            # Business logic layer
│   │   │   ├── employee_service.py
│   │   │   ├── attendance_service.py
│   │   │   ├── shift_service.py
│   │   │   ├── payroll_service.py
│   │   │   └── face_recognition_service.py
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── main.py              # FastAPI application entry point
│   ├── alembic/                 # Database migrations
│   └── requirements.txt         # Python dependencies
├──  frontend/                   # React Frontend
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── EmployeeManagement.tsx
│   │   │   ├── AttendanceTracker.tsx
│   │   │   ├── ShiftManagement.tsx
│   │   │   ├── PayrollManagement.tsx
│   │   │   └── FaceRecognition.tsx
│   │   ├── pages/               # Page-level components
│   │   ├── services/            # API service layer
│   │   │   └── api.ts           # Axios configuration
│   │   ├── types/               # TypeScript type definitions
│   │   └── App.tsx              # Main application component
│   └── package.json             # Node.js dependencies
├── 📄 docs/                      # Documentation
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Webcam** for facial recognition (optional)

### 🔧 Backend Setup

1. **Clone and navigate to backend:**
   ```bash
   git clone <repository-url>
   cd attendance/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```
   
   ✅ Backend will be available at: `http://localhost:8001`
   📚 API Documentation: `http://localhost:8001/docs`

### 🎨 Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```
   
   ✅ Frontend will be available at: `http://localhost:3000`

### 🎯 Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

## 📊 System Status

### ✅ Completed Features
- [x] **Authentication System** - JWT-based login/logout
- [x] **Employee Management** - Full CRUD operations
- [x] **Face Recognition** - AI-powered attendance tracking
- [x] **Shift Management** - Template creation and assignment
- [x] **Payroll System** - Automated salary calculations
- [x] **Attendance Tracking** - Real-time check-in/check-out
- [x] **Dashboard Analytics** - Live statistics and charts
- [x] **Reports Generation** - Comprehensive reporting system
- [x] **Role-Based Access** - Admin and accounting permissions
- [x] **Modern UI/UX** - Material-UI responsive design

### 🎯 Production Ready
- [x] **Database Models** - Complete SQLAlchemy implementation
- [x] **API Documentation** - Auto-generated Swagger docs
- [x] **Error Handling** - Comprehensive error management
- [x] **Security** - Encrypted passwords and secure tokens
- [x] **CORS Configuration** - Cross-origin request handling
- [x] **Data Validation** - Pydantic request/response validation

## 🎯 Key Features Showcase

### 🔍 Facial Recognition System
- **High Accuracy**: 95%+ recognition rate with proper lighting
- **Real-time Processing**: Sub-second face detection and matching
- **Privacy First**: Only mathematical encodings stored, not images
- **Fallback Options**: Manual check-in available when needed

### 💼 Shift Management
- **Template System**: Predefined shifts (Morning, Evening, Night, Weekend)
- **Flexible Scheduling**: Custom shift creation with time and day selection
- **Employee Assignment**: Easy drag-and-drop shift assignments
- **Compliance Tracking**: Monitor shift adherence and overtime

### 💰 Payroll Processing
- **Automated Calculations**: Hours × Rate + Overtime (1.5x) + Bonuses
- **Deduction Management**: Taxes, insurance, penalties, and custom deductions
- **Period Management**: Monthly, bi-weekly, or custom payroll periods
- **Approval Workflow**: Multi-step approval process for payroll records

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Live attendance statistics and trends
- **Comprehensive Reports**: Attendance, payroll, and performance reports
- **Export Options**: PDF and Excel export capabilities
- **Visual Analytics**: Charts and graphs for data insights

## 🛠️ API Endpoints

### Authentication
- `POST /api/v1/auth/token` - User login
- `GET /api/v1/auth/me` - Get current user info

### Employee Management
- `GET /api/v1/employees/` - List all employees
- `POST /api/v1/employees/` - Create new employee
- `PUT /api/v1/employees/{id}` - Update employee
- `DELETE /api/v1/employees/{id}` - Delete employee

### Attendance Tracking
- `POST /api/v1/attendance/check-in` - Employee check-in
- `POST /api/v1/attendance/check-out` - Employee check-out
- `GET /api/v1/attendance/records` - Get attendance records

### Face Recognition
- `POST /api/v1/face/upload` - Upload employee face data
- `POST /api/v1/face/recognize` - Recognize face for attendance

### Shift Management
- `GET /api/v1/shifts/` - List all shifts
- `POST /api/v1/shifts/` - Create new shift
- `GET /api/v1/shifts/templates/predefined` - Get shift templates

### Payroll System
- `GET /api/v1/payroll/periods` - List payroll periods
- `POST /api/v1/payroll/periods` - Create payroll period
- `POST /api/v1/payroll/periods/{id}/calculate` - Calculate payroll

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=sqlite:///./attendance.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Origins
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Database Configuration
The system uses SQLite by default for easy setup. For production, you can switch to PostgreSQL or MySQL by updating the `DATABASE_URL`.

## 🚀 Deployment

### Production Deployment
1. **Backend**: Deploy using Docker, Heroku, or any Python hosting service
2. **Frontend**: Build and deploy to Netlify, Vercel, or any static hosting
3. **Database**: Use managed database services (AWS RDS, Google Cloud SQL)

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for frontend development
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI** for the excellent Python web framework
- **React** and **Material-UI** for the beautiful frontend
- **OpenCV** and **face_recognition** for AI capabilities
- **SQLAlchemy** for robust database management

---

**⭐ If you find this project helpful, please give it a star!**

**🐛 Found a bug or have a feature request? Please open an issue.**

**💬 Questions? Feel free to reach out or start a discussion.**
