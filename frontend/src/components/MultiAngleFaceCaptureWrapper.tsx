import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import MultiAngleFaceCapture from './MultiAngleFaceCapture';

const MultiAngleFaceCaptureWrapper: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/employees/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch employee data');
        }

        const employeeData = await response.json();
        setEmployee(employeeData);
      } catch (error: any) {
        console.error('Error fetching employee:', error);
        setError(error.message || 'Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    } else {
      setError('No employee ID provided');
      setLoading(false);
    }
  }, [employeeId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading employee data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Employee not found</Typography>
      </Box>
    );
  }

  return (
    <MultiAngleFaceCapture
      employeeId={parseInt(employeeId!)}
      employeeName={employee.name}
      onComplete={(result) => {
        console.log('Multi-angle face capture completed:', result);
        navigate('/employees');
      }}
      onCancel={() => {
        navigate('/employees');
      }}
    />
  );
};

export default MultiAngleFaceCaptureWrapper;
