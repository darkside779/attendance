import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CameraAlt,
  Stop,
  PhotoCamera,
  Refresh,
} from '@mui/icons-material';

interface FaceCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  title?: string;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({
  onCapture,
  onError,
  isLoading = false,
  title = "Face Capture"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage = 'Failed to access camera. Please ensure camera permissions are granted.';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.8);
  }, [onCapture]);

  const retryCamera = useCallback(() => {
    stopCamera();
    setTimeout(startCamera, 500);
  }, [startCamera, stopCamera]);

  return (
    <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom align="center">
        {title}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button size="small" onClick={retryCamera} sx={{ ml: 1 }}>
            Retry
          </Button>
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: 480,
              height: 'auto',
              borderRadius: 8,
              backgroundColor: '#000'
            }}
          />
          
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 2
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}
        </Box>

        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isStreaming ? (
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={startCamera}
              disabled={isLoading}
            >
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PhotoCamera />}
                onClick={capturePhoto}
                disabled={isLoading}
              >
                Capture Photo
              </Button>
              <Button
                variant="outlined"
                startIcon={<Stop />}
                onClick={stopCamera}
                disabled={isLoading}
              >
                Stop Camera
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={retryCamera}
                disabled={isLoading}
              >
                Retry
              </Button>
            </>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {!isStreaming 
            ? "Click 'Start Camera' to begin face capture"
            : "Position your face in the camera view and click 'Capture Photo'"
          }
        </Typography>
      </Paper>
    </Box>
  );
};

export default FaceCapture;
