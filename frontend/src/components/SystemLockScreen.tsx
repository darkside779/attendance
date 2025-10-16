import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Divider
} from '@mui/material';
import {
  Lock,
  LockOpen,
  Schedule,
  Security,
  Warning
} from '@mui/icons-material';
import { getApiBaseUrl } from '../utils/apiUrl';

interface LockStatus {
  is_locked: boolean;
  locked_at?: string;
  expires_at: string;
  days_remaining: number;
  lock_reason?: string;
  unlock_attempts: number;
}

interface SystemLockScreenProps {
  onUnlock: () => void;
}

const SystemLockScreen: React.FC<SystemLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    fetchLockStatus();
  }, []);

  const fetchLockStatus = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/system-lock/status`);
      if (response.ok) {
        const status = await response.json();
        setLockStatus(status);
        setAttempts(status.unlock_attempts || 0);
      }
    } catch (error) {
      console.error('Error fetching lock status:', error);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the unlock password');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/system-lock/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setPassword('');
        setTimeout(() => {
          onUnlock();
        }, 2000);
      } else {
        setError(result.message);
        setAttempts(result.attempts || attempts + 1);
        setPassword('');
      }
    } catch (error) {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(45deg, #f44336 30%, #ff9800 90%)',
              color: 'white',
              padding: 3,
              textAlign: 'center'
            }}
          >
            <Lock sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              System Locked
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Attendance Management System
            </Typography>
          </Box>

          <CardContent sx={{ padding: 4 }}>
            {/* Lock Status Info */}
            {lockStatus && (
              <Box sx={{ mb: 3 }}>
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Reason:</strong> {lockStatus.lock_reason}
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Schedule color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h6" color="primary">
                      {lockStatus.days_remaining}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Days Remaining
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Security color="error" sx={{ fontSize: 32 }} />
                    <Typography variant="h6" color="error">
                      {attempts}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Failed Attempts
                    </Typography>
                  </Box>
                </Box>

                {lockStatus.expires_at && (
                  <Typography variant="body2" color="textSecondary" textAlign="center">
                    License expires: {formatDate(lockStatus.expires_at)}
                  </Typography>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Unlock Form */}
            <form onSubmit={handleUnlock}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockOpen color="primary" />
                Enter Unlock Password
              </Typography>

              <TextField
                fullWidth
                type="password"
                label="Unlock Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                sx={{ mb: 3 }}
                autoFocus
                placeholder="Enter system unlock password"
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !password.trim()}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                  }
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <LockOpen sx={{ mr: 1 }} />
                    Unlock System
                  </>
                )}
              </Button>
            </form>

            {/* Info */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">
                This system automatically locks every 30 days for security purposes.
                <br />
                Contact your system administrator if you need assistance.
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  );
};

export default SystemLockScreen;
