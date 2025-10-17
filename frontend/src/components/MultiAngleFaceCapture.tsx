import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper
} from '@mui/material';
import {
  CameraAlt,
  CheckCircle,
  Refresh,
  Upload,
  Face,
  RotateLeft,
  RotateRight,
  CenterFocusStrong
} from '@mui/icons-material';

interface MultiAngleFaceCaptureProps {
  employeeId: number;
  employeeName: string;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

interface CapturedImage {
  file: File;
  preview: string;
  angle: string;
  quality?: number;
}

const MultiAngleFaceCapture: React.FC<MultiAngleFaceCaptureProps> = ({
  employeeId,
  employeeName,
  onComplete,
  onCancel
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureSteps = [
    {
      label: 'Front View',
      angle: 'front',
      icon: <CenterFocusStrong />,
      instruction: 'Look directly at the camera with a neutral expression'
    },
    {
      label: 'Left Profile',
      angle: 'left',
      icon: <RotateLeft />,
      instruction: 'Turn your head slightly to the left (your left)'
    },
    {
      label: 'Right Profile', 
      angle: 'right',
      icon: <RotateRight />,
      instruction: 'Turn your head slightly to the right (your right)'
    },
    {
      label: 'Slight Up Angle',
      angle: 'up',
      icon: <Face />,
      instruction: 'Tilt your head slightly upward'
    },
    {
      label: 'Slight Down Angle',
      angle: 'down',
      icon: <Face />,
      instruction: 'Tilt your head slightly downward'
    }
  ];

  // Camera functions (simplified like RealTimeFaceRegistration)
  const startCamera = async () => {
    try {
      console.log('📷 Starting camera...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      console.log('🔍 Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('✅ Camera stream obtained:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks().length);
      
      // Store stream first, then set camera open to render video element
      setStream(stream);
      setIsCameraOpen(true);
      
      // Wait for video element to be rendered, then set up the stream
      const setupVideo = () => {
        if (videoRef.current) {
          console.log('📺 Setting video source...');
          videoRef.current.srcObject = stream;
          
          // Add event listeners for debugging
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded');
          };
          
          videoRef.current.oncanplay = () => {
            console.log('✅ Video can play');
          };
          
          videoRef.current.onerror = (e) => {
            console.error('❌ Video element error:', e);
          };
          
          // Try to play the video
          videoRef.current.play().then(() => {
            console.log('▶️ Video playing');
            // Enable capture after video starts playing
            setTimeout(() => {
              console.log('✅ Camera ready for capture!');
              setIsVideoReady(true);
            }, 2000);
          }).catch(playError => {
            console.error('❌ Video play error:', playError);
            // Still enable capture even if autoplay fails
            setTimeout(() => {
              console.log('✅ Camera ready for capture! (autoplay failed but manual capture should work)');
              setIsVideoReady(true);
            }, 2000);
          });
          
        } else {
          console.log('⏳ Video element not ready yet, retrying...');
          // Retry after a short delay
          setTimeout(setupVideo, 100);
        }
      };
      
      // Start setup process
      setTimeout(setupVideo, 100);
      
      setError(null);
    } catch (error: any) {
      console.error('❌ Camera error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setIsVideoReady(false);
  };

  // Capture current frame (same as RealTimeFaceRegistration)
  const capturePhoto = () => {
    console.log('📸 Capturing photo...');
    
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Canvas not supported. Please try a different browser.');
      return;
    }

    // Set canvas size and draw video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture image. Please try again.');
        return;
      }

      console.log('✅ Photo captured successfully');

      const file = new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);
      const currentStep = captureSteps[activeStep];
      
      const newImage: CapturedImage = {
        file,
        preview,
        angle: currentStep.angle
      };

      // Update captured images
      const updatedImages = [...capturedImages];
      updatedImages[activeStep] = newImage;
      setCapturedImages(updatedImages);

      console.log(`📷 Photo ${activeStep + 1} captured for angle: ${currentStep.angle}`);

      // Move to next step if not at the end
      if (activeStep < captureSteps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        // All photos captured, stop camera
        console.log('🎉 All photos captured! Stopping camera.');
        stopCamera();
      }

      setError(null);
    }, 'image/jpeg', 0.8);
  };

  // Cleanup camera on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Debug video ref availability
  React.useEffect(() => {
    console.log('🔍 Video ref status:', videoRef.current ? 'Available' : 'Not available');
  }, [isCameraOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    const currentStep = captureSteps[activeStep];
    
    const newImage: CapturedImage = {
      file,
      preview,
      angle: currentStep.angle
    };

    // Update captured images
    const updatedImages = [...capturedImages];
    updatedImages[activeStep] = newImage;
    setCapturedImages(updatedImages);

    // Move to next step if not at the end
    if (activeStep < captureSteps.length - 1) {
      setActiveStep(activeStep + 1);
    }

    setError(null);
  };

  const handleRetakePhoto = (stepIndex: number) => {
    setActiveStep(stepIndex);
    const updatedImages = [...capturedImages];
    if (updatedImages[stepIndex]) {
      URL.revokeObjectURL(updatedImages[stepIndex].preview);
      updatedImages[stepIndex] = undefined as any;
      setCapturedImages(updatedImages);
    }
  };

  const handleUpload = async () => {
    if (capturedImages.filter(img => img).length < 3) {
      setError('Please capture at least 3 images from different angles');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add all captured images
      capturedImages.forEach((image, index) => {
        if (image) {
          formData.append('files', image.file);
        }
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/multi-face/register-multi-face/${employeeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      setResult(result);
      setUploadProgress(100);

      if (onComplete) {
        onComplete(result);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload face images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    // Clean up preview URLs
    capturedImages.forEach(image => {
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
    });
    
    setCapturedImages([]);
    setActiveStep(0);
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  if (result) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Multi-Angle Face Registration Complete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully registered {result.data?.encodings_count} face encodings for {employeeName}
          </Alert>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Registration Summary:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {result.data?.encodings_count || 0}
                  </Typography>
                  <Typography variant="body2">Face Encodings</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {result.data?.landmarks_count || 0}
                  </Typography>
                  <Typography variant="body2">Landmark Sets</Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {result.data?.angles_detected && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Angles Detected:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {result.data.angles_detected.map((angle: string, index: number) => (
                    <Chip key={index} label={angle} size="small" />
                  ))}
                </Box>
              </Box>
            )}
            
            {result.data?.average_quality && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">
                  Average Image Quality: {(result.data.average_quality * 100).toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={result.data.average_quality * 100} 
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Face />
            Multi-Angle Face Registration
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Employee: {employeeName}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {captureSteps.map((step, index) => (
              <Step key={step.label} completed={!!capturedImages[index]}>
                <StepLabel
                  icon={capturedImages[index] ? <CheckCircle color="success" /> : step.icon}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {!isUploading && (
            <Box sx={{ mb: 3 }}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  {captureSteps[activeStep]?.label || 'Complete'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {captureSteps[activeStep]?.instruction || 'All photos captured!'}
                </Typography>
                
                {activeStep < captureSteps.length && (
                  <>
                    {!isCameraOpen ? (
                      <Box>
                        <Button
                          variant="contained"
                          startIcon={<CameraAlt />}
                          onClick={startCamera}
                          size="large"
                          sx={{ mb: 2 }}
                        >
                          Open Camera
                        </Button>
                        <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 2 }}>
                          Make sure to allow camera permissions when prompted
                        </Typography>
                        
                        {/* Debug info */}
                        <Typography variant="caption" display="block" color="textSecondary">
                          Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          Camera API: {navigator.mediaDevices ? '✅ Supported' : '❌ Not supported'}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          controls={false}
                          style={{
                            width: '100%',
                            maxWidth: '400px',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '2px solid #1976d2',
                            backgroundColor: '#f0f0f0'
                          }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          {!isVideoReady ? '⏳ Camera starting...' : '✅ Ready to capture'}
                        </Typography>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                          <Button
                            variant="contained"
                            startIcon={<CameraAlt />}
                            onClick={capturePhoto}
                            size="large"
                            disabled={!isVideoReady}
                          >
                            {!isVideoReady ? 'Loading...' : `Take Photo ${activeStep + 1}`}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={stopCamera}
                          >
                            Close Camera
                          </Button>
                        </Box>
                      </Box>
                    )}
                    
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Or{' '}
                      <Button
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        upload from file
                      </Button>
                    </Typography>
                  </>
                )}
              </Card>
            </Box>
          )}

          {/* Preview captured images */}
          {capturedImages.some(img => img) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Captured Images:</Typography>
              <Grid container spacing={2}>
                {capturedImages.map((image, index) => (
                  image && (
                    <Grid item xs={6} sm={4} md={2.4} key={index}>
                      <Card>
                        <Box
                          component="img"
                          src={image.preview}
                          alt={`${image.angle} view`}
                          sx={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover'
                          }}
                        />
                        <CardContent sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="caption" display="block">
                            {captureSteps[index].label}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<Refresh />}
                            onClick={() => handleRetakePhoto(index)}
                          >
                            Retake
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                ))}
              </Grid>
            </Box>
          )}

          {isUploading && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Processing face images...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              startIcon={<Refresh />}
              disabled={isUploading}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={handleUpload}
              disabled={capturedImages.filter(img => img).length < 3 || isUploading}
            >
              Register Faces ({capturedImages.filter(img => img).length}/5)
            </Button>
          </Box>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default MultiAngleFaceCapture;
