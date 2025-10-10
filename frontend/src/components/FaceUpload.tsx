import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  Face,
  CheckCircle,
} from '@mui/icons-material';
import FaceCapture from './FaceCapture';
import { faceAPI } from '../services/attendanceAPI';

interface FaceUploadProps {
  employeeId: number;
  employeeName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FaceUpload: React.FC<FaceUploadProps> = ({
  employeeId,
  employeeName,
  open,
  onClose,
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);

  const steps = ['Capture Face', 'Validate', 'Upload'];

  const handleFaceCapture = async (imageBlob: Blob) => {
    setCapturedImage(imageBlob);
    setIsLoading(true);
    setError(null);

    try {
      // Validate image first
      const formData = new FormData();
      formData.append('file', imageBlob, 'face-capture.jpg');
      
      const validation = await faceAPI.validateImage(formData);
      
      if (!validation.validation.valid) {
        setError(validation.validation.reason);
        setIsLoading(false);
        return;
      }

      if (validation.faces_detected !== 1) {
        setError(`Expected 1 face, but detected ${validation.faces_detected} faces`);
        setIsLoading(false);
        return;
      }

      setActiveStep(1);
      setIsLoading(false);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to validate image');
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', capturedImage, 'face-capture.jpg');
      
      const uploadResult = await faceAPI.uploadFace(employeeId, formData);
      setResult(uploadResult);
      setActiveStep(2);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to upload face data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setResult(null);
    setCapturedImage(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Please position your face clearly in the camera view and capture a photo.
            </Typography>
            <FaceCapture
              onCapture={handleFaceCapture}
              onError={setError}
              isLoading={isLoading}
              title={`Face Capture for ${employeeName}`}
            />
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Face sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Face Validation Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Your face has been detected and validated successfully.
              Click "Upload Face Data" to save it to the system.
            </Typography>
            
            {capturedImage && (
              <Paper sx={{ p: 2, mt: 2, display: 'inline-block' }}>
                <img
                  src={URL.createObjectURL(capturedImage)}
                  alt="Captured face"
                  style={{
                    maxWidth: 200,
                    maxHeight: 200,
                    borderRadius: 8
                  }}
                />
              </Paper>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Face Data Uploaded Successfully!
            </Typography>
            {result && (
              <Box>
                <Typography variant="body1" color="text.secondary">
                  Face data for {result.employee_name} has been saved to the system.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Face encoding length: {result.face_encoding_length} features
                </Typography>
              </Box>
            )}
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 }
      }}
    >
      <DialogTitle>
        Upload Face Data - {employeeName}
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </Button>
        
        {activeStep === 0 && capturedImage && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(0)}
            disabled={isLoading}
          >
            Retake Photo
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={handleUpload}
            disabled={isLoading}
          >
            Upload Face Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FaceUpload;
