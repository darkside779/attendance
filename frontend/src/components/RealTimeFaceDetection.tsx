import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CameraAlt,
  Stop,
  Refresh
} from '@mui/icons-material';
import { faceAPI } from '../services/attendanceAPI';

interface DetectedFace {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  absolute: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface RecognizedFace {
  face_id: number;
  employee_name: string;
  employee_id: string | null;
  department: string | null;
  confidence: number;
}

interface RealTimeFaceDetectionProps {
  onEmployeeDetected?: (employee: RecognizedFace) => void;
  onFaceDetected?: (faces: DetectedFace[]) => void;
  autoDetect?: boolean;
  showConfidence?: boolean;
}

const RealTimeFaceDetection: React.FC<RealTimeFaceDetectionProps> = ({
  onEmployeeDetected,
  onFaceDetected,
  autoDetect = true,
  showConfidence = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);

        // Wait for video to load to get actual dimensions
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            const { videoWidth, videoHeight } = videoRef.current;
            setVideoSize({ width: videoWidth, height: videoHeight });
          }
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      let errorMessage = 'Failed to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotSecureError' || err.message?.includes('secure')) {
        errorMessage += 'Camera access requires HTTPS or localhost. Try accessing via: http://localhost:3000 or enable insecure origins in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += 'Please ensure camera permissions are granted and try again.';
      }
      
      setError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsStreaming(false);
    setDetectedFaces([]);
    setRecognizedFaces([]);
  }, []);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return Promise.resolve(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return Promise.resolve(null);

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  }, []);

  const detectFaces = useCallback(async () => {
    if (!isStreaming || isDetecting) return;

    try {
      setIsDetecting(true);
      const frameBlob = await captureFrame();
      
      if (!frameBlob) return;

      const formData = new FormData();
      formData.append('file', frameBlob, 'frame.jpg');

      const response = await faceAPI.detectFacesRealtime(formData);
      
      if (response.faces_detected > 0) {
        setDetectedFaces(response.faces);
        setRecognizedFaces(response.recognized);
        
        // Notify parent components
        if (onFaceDetected) {
        }
        
        // If an employee is recognized, notify parent
        const recognizedEmployee = response.recognized.find(
          (face: RecognizedFace) => face.employee_name !== 'Unknown'
        );
        
        // Notify parent component about detected employee
        if (recognizedEmployee && onEmployeeDetected) {
          onEmployeeDetected(recognizedEmployee);
          // Clear any previous error messages when employee is detected
          setError(null);
        }
      } else {
        setDetectedFaces([]);
        setRecognizedFaces([]);
      }
    } catch (err) {
      console.error('Face detection error:', err);
      // Don't show error for detection failures, just continue
    } finally {
      setIsDetecting(false);
    }
  }, [isStreaming, isDetecting, captureFrame, onFaceDetected, onEmployeeDetected]);

  // Start auto-detection when camera is active
  useEffect(() => {
    if (isStreaming && autoDetect) {
      detectionIntervalRef.current = setInterval(detectFaces, 1000); // Detect every second
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    }
  }, [isStreaming, autoDetect, detectFaces]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const drawFaceOverlays = () => {
    if (!videoRef.current || detectedFaces.length === 0) return null;

    const video = videoRef.current;
    const videoRect = video.getBoundingClientRect();
    
    return detectedFaces.map((face, index) => {
      // Calculate position relative to video display size
      const scaleX = videoRect.width / videoSize.width;
      const scaleY = videoRect.height / videoSize.height;
      
      const x = face.x * videoRect.width;
      const y = face.y * videoRect.height;
      const width = face.width * videoRect.width;
      const height = face.height * videoRect.height;

      // Find corresponding recognized face
      const recognized = recognizedFaces.find(r => r.face_id === face.id);
      const isRecognized = recognized && recognized.employee_name !== 'Unknown';

      return (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            left: x,
            top: y,
            width: width,
            height: height,
            border: isRecognized ? '3px solid #4caf50' : '3px solid #ff9800',
            borderRadius: 1,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {/* Employee name label */}
          {recognized && (
            <Box
              sx={{
                position: 'absolute',
                top: -40,
                left: 0,
                backgroundColor: isRecognized ? '#4caf50' : '#ff9800',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 1,
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                maxWidth: width,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {recognized.employee_name}
              {showConfidence && isRecognized && (
                <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                  ({recognized.confidence.toFixed(0)}%)
                </span>
              )}
            </Box>
          )}
        </Box>
      );
    });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Real-Time Face Detection
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Camera Controls */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        {!isStreaming ? (
          <Button
            variant="contained"
            startIcon={<CameraAlt />}
            onClick={startCamera}
            color="primary"
          >
            Start Camera
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Stop />}
            onClick={stopCamera}
            color="error"
          >
            Stop Camera
          </Button>
        )}

        {isStreaming && !autoDetect && (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={detectFaces}
            disabled={isDetecting}
          >
            {isDetecting ? <CircularProgress size={20} /> : 'Detect Faces'}
          </Button>
        )}

        {isDetecting && autoDetect && (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Detecting..."
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Video Display */}
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: 640,
            height: 'auto',
            borderRadius: 8,
            backgroundColor: '#000'
          }}
        />
        
        {/* Face Detection Overlays */}
        {isStreaming && drawFaceOverlays()}
        
        {/* Hidden canvas for frame capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Detection Status */}
      {isStreaming && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Faces detected: {detectedFaces.length}
          </Typography>
          
          {recognizedFaces.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {recognizedFaces.map((face, index) => (
                <Chip
                  key={index}
                  label={
                    face.employee_name === 'Unknown' 
                      ? 'Unknown Person' 
                      : `${face.employee_name} (${face.confidence.toFixed(0)}%)`
                  }
                  color={face.employee_name === 'Unknown' ? 'default' : 'success'}
                  size="small"
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default RealTimeFaceDetection;
