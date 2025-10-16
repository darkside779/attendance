import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiUrl';

interface LockStatus {
  is_locked: boolean;
  locked_at?: string;
  expires_at: string;
  days_remaining: number;
  lock_reason?: string;
  unlock_attempts: number;
}

interface LicenseInfo {
  expires_at: string;
  days_remaining: number;
  hours_remaining: number;
  is_locked: boolean;
  created_at?: string;
}

export const useSystemLock = () => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkSystemStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/system-lock/status`);
      
      if (response.status === 423) {
        // System is locked
        const data = await response.json();
        setIsLocked(true);
        setLockStatus(data.lock_info);
        return;
      }
      
      if (response.ok) {
        const status = await response.json();
        setIsLocked(status.is_locked);
        setLockStatus(status);
      } else {
        throw new Error('Failed to check system status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error checking system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getLicenseInfo = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/system-lock/license-info`);
      if (response.ok) {
        const info = await response.json();
        setLicenseInfo(info);
        return info;
      }
    } catch (err) {
      console.error('Error getting license info:', err);
    }
    return null;
  }, []);

  const unlockSystem = useCallback(async (password: string) => {
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
        setIsLocked(false);
        setLockStatus(null);
        // Refresh license info
        await getLicenseInfo();
      }
      
      return result;
    } catch (err) {
      throw new Error('Failed to unlock system');
    }
  }, [getLicenseInfo]);

  // Check system status on mount and periodically
  useEffect(() => {
    checkSystemStatus();
    
    // Check every 5 minutes
    const interval = setInterval(checkSystemStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkSystemStatus]);

  // Get license info on mount
  useEffect(() => {
    getLicenseInfo();
  }, [getLicenseInfo]);

  return {
    isLocked,
    lockStatus,
    licenseInfo,
    loading,
    error,
    checkSystemStatus,
    getLicenseInfo,
    unlockSystem,
  };
};
