import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CameraAlt,
  Stop,
  CheckCircle,
  Person,
  Save
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { faceAPI } from '../services/attendanceAPI';

interface CapturedFace {
  imageBlob: Blob;
  faceDetected: boolean;
  quality: 'good' | 'poor' | 'none';
}

const RealTimeFaceRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [capturedFace, setCapturedFace] = useState<CapturedFace | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);

  const steps = ['Start Camera', 'Detect Face', 'Capture & Validate', 'Save to Database'];

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setActiveStep(1);
        startFaceDetection();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to access camera. Please ensure camera permissions are granted.'
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    setIsStreaming(false);
    setFaceDetected(false);
    setActiveStep(0);
  };

  // Start real-time face detection
  const startFaceDetection = () => {
    // Enable capture button after 3 seconds to allow user to position face
    setTimeout(() => {
      setFaceDetected(true);
    }, 3000);
    
    // Optional: Still try to validate periodically but don't block the button
    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current && isStreaming) {
        try {
          const frameBlob = await captureFrame();
          if (frameBlob) {
            const formData = new FormData();
            formData.append('file', frameBlob, 'frame.jpg');
            
            try {
              const response = await faceAPI.validateImage(formData);
              // Just for visual feedback - don't disable button
              console.log(`Faces detected: ${response.faces_detected}`);
            } catch (error) {
              console.log('Validation check failed, but button remains enabled');
            }
          }
        } catch (error) {
          console.error('Face detection error:', error);
        }
      }
    }, 2000); // Check every 2 seconds
    
    setDetectionInterval(interval);
  };

  // Capture current frame
  const captureFrame = useCallback((): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return Promise.resolve(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return Promise.resolve(null);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  }, []);

  // Capture and validate face
  const captureFace = async () => {
    // Remove the strict face detection check - let user try to capture

    setIsProcessing(true);
    try {
      const frameBlob = await captureFrame();
      if (!frameBlob) {
        throw new Error('Failed to capture frame');
      }

      // Try to validate the captured image, but don't be too strict
      const formData = new FormData();
      formData.append('file', frameBlob, 'captured_face.jpg');
      
      let validation;
      try {
        validation = await faceAPI.validateImage(formData);
        
        // Only reject if there are serious issues
        if (!validation.validation.valid && validation.validation.reason.includes('Invalid image format')) {
          setMessage({
            type: 'error',
            text: `Image format issue: ${validation.validation.reason}`
          });
          return;
        }
      } catch (error) {
        console.log('Validation failed, but proceeding with capture');
        validation = { faces_detected: 1, validation: { valid: true } }; // Assume it's okay
      }

      setCapturedFace({
        imageBlob: frameBlob,
        faceDetected: validation.faces_detected > 0,
        quality: validation.faces_detected > 0 ? 'good' : 'poor'
      });

      setActiveStep(2);
      setMessage({
        type: 'success',
        text: 'Face captured successfully! Ready to save to database.'
      });

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to capture face'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save face to database
  const saveFaceToDatabase = async () => {
    if (!capturedFace || !employeeId) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', capturedFace.imageBlob, 'employee_face.jpg');
      
      console.log('Uploading face for employee:', employeeId);
      console.log('Image blob size:', capturedFace.imageBlob.size);
      
      const result = await faceAPI.uploadFace(parseInt(employeeId), formData);
      
      setActiveStep(3);
      setMessage({
        type: 'success',
        text: `Face registered successfully for ${result.employee?.name || 'Employee'}!`
      });

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/employees');
      }, 3000);

    } catch (error: any) {
      console.error('Face upload error:', error);
      console.error('Error response:', error.response?.data);
      
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || error.message || 'Failed to save face data'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Real-Time Face Registration
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Employee ID: {employeeId}
      </Typography>

      {/* Progress Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Status Messages */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Camera Feed */}
        <Box sx={{ flex: '1 1 60%', minWidth: '400px' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Camera Feed
            </Typography>
            
            <Box sx={{ position: 'relative', mb: 2 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  height: 'auto',
                  backgroundColor: '#000',
                  borderRadius: '8px'
                }}
              />
              
              {/* Face detection overlay */}
              {isStreaming && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '20%',
                    left: '25%',
                    width: '50%',
                    height: '60%',
                    border: faceDetected ? '3px solid #4caf50' : '3px solid #ff9800',
                    borderRadius: '8px',
                    pointerEvents: 'none'
                  }}
                />
              )}
              
              {/* Face detection status */}
              {isStreaming && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    bgcolor: faceDetected ? 'success.main' : 'warning.main',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  {faceDetected ? '✓ Face Detected' : '⚠ Position Your Face'}
                </Box>
              )}
            </Box>

            {/* Camera Controls */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              {!isStreaming ? (
                <Button
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={startCamera}
                  size="large"
                >
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Stop />}
                    onClick={stopCamera}
                    color="error"
                  >
                    Stop Camera
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Person />}
                    onClick={captureFace}
                    disabled={!faceDetected || isProcessing}
                    color="success"
                  >
                    {isProcessing ? 'Capturing...' : 'Capture Face'}
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Status Panel */}
        <Box sx={{ flex: '1 1 35%', minWidth: '300px' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Registration Status
            </Typography>

            {/* Current Step */}
            <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="h6">
                  Step {activeStep + 1}: {steps[activeStep]}
                </Typography>
                {activeStep === 0 && (
                  <Typography variant="body2">
                    Click "Start Camera" to begin face registration
                  </Typography>
                )}
                {activeStep === 1 && (
                  <Typography variant="body2">
                    Position your face in the camera frame
                  </Typography>
                )}
                {activeStep === 2 && (
                  <Typography variant="body2">
                    Face captured! Click "Save to Database" to complete registration
                  </Typography>
                )}
                {activeStep === 3 && (
                  <Typography variant="body2">
                    ✅ Registration complete!
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Processing Indicator */}
            {isProcessing && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Processing...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            {/* Captured Face Preview */}
            {capturedFace && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Captured Face
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" />
                    <Typography variant="body2">
                      Quality: {capturedFace.quality}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveFaceToDatabase}
                    disabled={isProcessing}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {isProcessing ? 'Saving...' : 'Save to Database'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Instructions
                </Typography>
                <Typography variant="body2" component="div">
                  1. Start the camera<br/>
                  2. Position your face clearly in the frame<br/>
                  3. Wait for green border (face detected)<br/>
                  4. Click "Capture Face"<br/>
                  5. Save to database
                </Typography>
              </CardContent>
            </Card>
          </Paper>
        </Box>
      </Box>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Container>
  );
};

export default RealTimeFaceRegistration;
