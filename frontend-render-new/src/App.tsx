import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
import { Dashboard, EmployeeManagement, AttendanceTracker, AttendanceTrackerRealTime, RealTimeFaceRegistration, Reports, AttendanceEdit, PayrollManagement, ShiftManagement } from './components';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <AttendanceTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-realtime"
              element={
                <ProtectedRoute>
                  <AttendanceTrackerRealTime />
                </ProtectedRoute>
              }
            />
            <Route
              path="/face-register/:employeeId"
              element={
                <ProtectedRoute>
                  <RealTimeFaceRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-edit"
              element={
                <ProtectedRoute>
                  <AttendanceEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <PayrollManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <ProtectedRoute>
                  <ShiftManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
