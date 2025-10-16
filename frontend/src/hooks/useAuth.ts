import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Check for stored authentication data on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const hasRole = (role: string): boolean => {
    return authState.user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return authState.user ? roles.includes(authState.user.role) : false;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isAccounting = (): boolean => {
    return hasRole('accounting');
  };

  const canAccessModule = (module: string): boolean => {
    if (!authState.user) return false;

    const { role } = authState.user;

    // Define module access permissions
    const permissions = {
      admin: [
        'dashboard', 'employees', 'attendance', 'face-recognition', 
        'reports', 'payroll', 'shifts', 'system-settings'
      ],
      accounting: [
        'accounting-dashboard', 'employees', 'attendance', 'reports', 'payroll'
      ]
    };

    const userPermissions = permissions[role as keyof typeof permissions] || [];
    return userPermissions.includes(module);
  };

  return {
    ...authState,
    login,
    logout,
    hasRole,
    hasAnyRole,
    isAdmin,
    isAccounting,
    canAccessModule
  };
};
