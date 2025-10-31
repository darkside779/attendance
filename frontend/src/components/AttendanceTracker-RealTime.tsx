import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  ExitToApp,
  AccessTime,
  Person,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import RealTimeFaceDetection from './RealTimeFaceDetection';
import { attendanceAPI } from '../services/attendanceAPI';

interface RecognizedEmployee {
  face_id: number;
  employee_name: string;
  employee_id: string | null;
  department: string | null;
  confidence: number;
}

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
}

const AttendanceTrackerRealTime: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [mode, setMode] = useState<'check-in' | 'check-out'>('check-in');
  const [detectedEmployee, setDetectedEmployee] = useState<RecognizedEmployee | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [autoCheckIn, setAutoCheckIn] = useState(false);

  // ============ VOICE ANNOUNCEMENT FUNCTIONS ============
  
  /**
   * Detect if the name contains Arabic characters
   * Arabic Unicode Range: \u0600-\u06FF
   */
  const detectLanguage = (name: string): 'ar' | 'en' => {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(name) ? 'ar' : 'en';
  };

  /**
   * Play success sound
   */
  const playSuccessSound = () => {
    try {
      const audio = new Audio('/sounds/success.wav');
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(err => {
        console.warn('Could not play success sound:', err);
      });
    } catch (error) {
      console.warn('Success sound not available:', error);
    }
  };

  /**
   * Announce employee name using Web Speech API
   */
  const announceEmployee = (employeeName: string, attendanceMode: 'check-in' | 'check-out') => {
    try {
      // Check if browser supports Speech Synthesis
      if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech not supported in this browser');
        return;
      }

      // Detect language
      const language = detectLanguage(employeeName);
      
      // Prepare greeting message based on mode
      let greeting: string;
      if (attendanceMode === 'check-in') {
        // Welcome message for check-in
        greeting = language === 'ar' 
          ? `مرحبا ${employeeName}` 
          : `Welcome ${employeeName}`;
      } else {
        // Goodbye message for check-out
        greeting = language === 'ar' 
          ? `وداعا ${employeeName}` 
          : `Goodbye ${employeeName}`;
      }

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(greeting);
      
      // Set language
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      
      // Set voice properties
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 0.8; // 80% volume

      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find appropriate voice for the language
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(language === 'ar' ? 'ar' : 'en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Speak the greeting
      window.speechSynthesis.speak(utterance);
      
      console.log(`🔊 Announcing: ${greeting} (Mode: ${attendanceMode}, Language: ${language})`);
      
    } catch (error) {
      console.warn('Voice announcement failed:', error);
    }
  };

  // ============ END VOICE ANNOUNCEMENT FUNCTIONS ============

  // Load today's attendance records
  const loadTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      setTodayAttendance(response.records || []);
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  // Handle employee detection from real-time camera
  const handleEmployeeDetected = async (employee: RecognizedEmployee) => {
    if (employee.employee_name === 'Unknown' || !employee.employee_id) {
      return;
    }

    setDetectedEmployee(employee);

    // Auto check-in/check-out if enabled and confidence is high
    if (autoCheckIn && employee.confidence > 80) {
      await handleAttendanceAction(employee);
    }
  };

  // Process check-in or check-out
  const handleAttendanceAction = async (employee: RecognizedEmployee) => {
    if (!employee.employee_id || isProcessing) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      // Capture actual camera image from video element
      const videoElement = document.querySelector('video');
      if (!videoElement) {
        throw new Error('Camera not available');
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw the current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      }
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
      });

      const formData = new FormData();
      formData.append('file', blob, 'detected_face.jpg');
      formData.append('employee_id', employee.employee_id);

      let result;
      if (mode === 'check-in') {
        console.log(`Attempting check-in for employee: ${employee.employee_name} (ID: ${employee.employee_id})`);
        result = await attendanceAPI.checkIn(formData);
        setMessage({
          type: 'success',
          text: `✅ ${employee.employee_name} checked in successfully!`
        });
        
        // Play success sound and announce employee name
        playSuccessSound();
        setTimeout(() => {
          announceEmployee(employee.employee_name, 'check-in');
        }, 500); // Small delay after sound
        
      } else {
        result = await attendanceAPI.checkOut(formData);
        setMessage({
          type: 'success',
          text: `✅ ${employee.employee_name} checked out successfully!`
        });
        
        // Play success sound and announce employee name
        playSuccessSound();
        setTimeout(() => {
          announceEmployee(employee.employee_name, 'check-out');
        }, 500); // Small delay after sound
      }

      // Reload attendance records
      await loadTodayAttendance();
      
      // Clear detected employee after successful action
      setTimeout(() => {
        setDetectedEmployee(null);
        setMessage(null);
      }, 3000);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || `Failed to ${mode.replace('-', ' ')}`;
      const displayMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      
      setMessage({
        type: 'error',
        text: displayMessage
      });
      
      console.error(`Check-in/out error for ${employee.employee_name}:`, displayMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual check-in/check-out button
  const handleManualAction = () => {
    if (detectedEmployee) {
      handleAttendanceAction(detectedEmployee);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => {
            if (user?.role === 'accounting') {
              navigate('/accounting-dashboard');
            } else {
              navigate('/dashboard');
            }
          }}
          variant="outlined"
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Real-Time Attendance Tracker
        </Typography>
      </Box>

      {/* Mode Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Select Mode
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant={mode === 'check-in' ? 'contained' : 'outlined'}
            startIcon={<CheckCircle />}
            onClick={() => setMode('check-in')}
            color="success"
          >
            Check In
          </Button>
          <Button
            variant={mode === 'check-out' ? 'contained' : 'outlined'}
            startIcon={<ExitToApp />}
            onClick={() => setMode('check-out')}
            color="error"
          >
            Check Out
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant={autoCheckIn ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setAutoCheckIn(!autoCheckIn)}
          >
            Auto {mode.replace('-', ' ')}: {autoCheckIn ? 'ON' : 'OFF'}
          </Button>
          <Typography variant="body2" color="textSecondary">
            {autoCheckIn 
              ? `Employees will be automatically ${mode.replace('-', ' ')}ed when detected with >80% confidence`
              : `Manual confirmation required for ${mode.replace('-', ' ')}`
            }
          </Typography>
        </Box>
      </Paper>

      {/* Status Messages */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Real-Time Camera */}
        <Box sx={{ flex: '1 1 60%', minWidth: '400px' }}>
          <RealTimeFaceDetection
            onEmployeeDetected={handleEmployeeDetected}
            autoDetect={true}
            showConfidence={true}
          />
        </Box>

        {/* Detection Status */}
        <Box sx={{ flex: '1 1 35%', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Detection Status
            </Typography>
            
            {detectedEmployee ? (
              <Card sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person />
                    <Typography variant="h6">
                      {detectedEmployee.employee_name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    ID: {detectedEmployee.employee_id}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Department: {detectedEmployee.department || 'N/A'}
                  </Typography>
                  <Chip
                    label={`${detectedEmployee.confidence.toFixed(0)}% Confidence`}
                    size="small"
                    sx={{ bgcolor: 'success.dark', color: 'white' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                Position your face in front of the camera for automatic detection
              </Alert>
            )}

            {/* Manual Action Button */}
            {detectedEmployee && !autoCheckIn && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleManualAction}
                disabled={isProcessing}
                startIcon={mode === 'check-in' ? <CheckCircle /> : <ExitToApp />}
                color={mode === 'check-in' ? 'success' : 'error'}
              >
                {isProcessing ? 'Processing...' : `${mode.replace('-', ' ').toUpperCase()} ${detectedEmployee.employee_name}`}
              </Button>
            )}

            {/* Today's Attendance Summary */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>
              Today's Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Employees:</Typography>
                <Chip label={todayAttendance.length} size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Checked In:</Typography>
                <Chip 
                  label={todayAttendance.filter(r => r.check_in && !r.check_out).length} 
                  size="small" 
                  color="success" 
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Completed:</Typography>
                <Chip 
                  label={todayAttendance.filter(r => r.check_in && r.check_out).length} 
                  size="small" 
                  color="primary" 
                />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Recent Activity */}
      {todayAttendance.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Today's Activity
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflow: 'auto' }}>
            {todayAttendance.slice(0, 5).map((record) => (
              <Box
                key={record.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {record.employee_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {record.check_in ? `In: ${record.check_in}` : 'Not checked in'}
                    {record.check_out && ` | Out: ${record.check_out}`}
                  </Typography>
                </Box>
                <Chip
                  label={record.status}
                  size="small"
                  color={
                    record.status === 'Present' ? 'success' :
                    record.status === 'Checked Out' ? 'primary' : 'default'
                  }
                />
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default AttendanceTrackerRealTime;
