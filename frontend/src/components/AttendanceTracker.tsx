import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle,
  ExitToApp,
  AccessTime,
  Person,
  ArrowBack,
  Refresh,
  People,
  Login,
  Logout
} from '@mui/icons-material';
import RealTimeFaceDetection from './RealTimeFaceDetection';
import {attendanceAPI} from '../services/attendanceAPI';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import FaceCapture from './FaceCapture';

interface AttendanceRecord {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
}

interface AttendanceSummary {
  total_employees: number;
  present: number;
  absent: number;
  checked_out: number;
  still_in: number;
}

const AttendanceTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [mode, setMode] = useState<'check-in' | 'check-out' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      setTodayRecords(response.records);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
    }
  };

  const handleFaceCapture = async (imageBlob: Blob) => {
    if (!mode) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face-capture.jpg');

      let response;
      if (mode === 'check-in') {
        response = await attendanceAPI.checkIn(formData);
      } else {
        response = await attendanceAPI.checkOut(formData);
      }

      setResult(response);
      setMode(null);
      
      // Refresh today's attendance
      await fetchTodayAttendance();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || `${mode} failed`;
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setMode(null);
    setError(null);
    setResult(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'warning';
      case 'checked_out': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => {
              if (user?.role === 'accounting') {
                navigate('/accounting-dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Attendance Tracker
          </Typography>
          <IconButton color="inherit" onClick={fetchTodayAttendance}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Summary Cards */}
        {summary && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4">{summary.total_employees}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Employees
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Login sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4">{summary.present}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Present Today
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTime sx={{ mr: 1, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4">{summary.still_in}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Still In Office
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Logout sx={{ mr: 1, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4">{summary.checked_out}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Checked Out
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Action Buttons */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Face Recognition Attendance
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<Login />}
                onClick={() => setMode('check-in')}
              >
                Check In
              </Button>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<Logout />}
                onClick={() => setMode('check-out')}
              >
                Check Out
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use your face to check in or check out of the office
            </Typography>
          </CardContent>
        </Card>

        {/* Today's Attendance Records */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Attendance ({new Date().toLocaleDateString()})
            </Typography>
            
            {todayRecords.length === 0 ? (
              <Typography color="text.secondary">
                No attendance records for today
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Check In</TableCell>
                      <TableCell>Check Out</TableCell>
                      <TableCell>Hours</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todayRecords.map((record) => (
                      <TableRow key={record.employee_id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {record.employee_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.employee_code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {record.check_in || '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_out || '-'}
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(record.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Face Capture Dialog */}
      <Dialog
        open={mode !== null}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {mode === 'check-in' ? 'Check In with Face Recognition' : 'Check Out with Face Recognition'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {result && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {result.message}
              <br />
              <Typography variant="body2">
                Employee: {result.employee?.name} ({result.employee?.employee_code})
                <br />
                Confidence: {result.recognition_confidence}%
              </Typography>
            </Alert>
          )}

          {!result && (
            <FaceCapture
              onCapture={handleFaceCapture}
              onError={setError}
              isLoading={isLoading}
              title={mode === 'check-in' ? 'Position your face for check-in' : 'Position your face for check-out'}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {result ? 'Close' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceTracker;
