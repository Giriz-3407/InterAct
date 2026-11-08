import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import type { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper to clear tokens from all storage to ensure only one active token exists
  const clearStorage = useCallback(() => {
    localStorage.removeItem('interact_auth_token');
    sessionStorage.removeItem('interact_auth_token');
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    setToken(null);
    setAuthError(null);
  }, [clearStorage]);

  // Session recovery on app startup
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('interact_auth_token') || sessionStorage.getItem('interact_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (err: any) {
        console.error('Session restoration failed:', err);
        // Handle backend unavailable differently from auth/invalid token errors
        if (err.message && (err.message.includes('unavailable') || err.message.includes('timed out') || err.message.includes('Database connection'))) {
          setAuthError('Unable to connect to the authentication server. Please check backend status or reload.');
          // Don't log out immediately so the user doesn't lose credentials when offline
        } else {
          // Token expired or invalid
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [logout]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setIsLoading(true);
    setAuthError(null);
    clearStorage();

    try {
      const data = await authService.login({ email, password });
      setToken(data.access_token);
      setUser(data.user);

      if (rememberMe) {
        localStorage.setItem('interact_auth_token', data.access_token);
      } else {
        sessionStorage.setItem('interact_auth_token', data.access_token);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    rememberMe: boolean
  ) => {
    setIsLoading(true);
    setAuthError(null);
    clearStorage();

    try {
      const data = await authService.register({ fullName, email, password, confirmPassword });
      setToken(data.access_token);
      setUser(data.user);

      if (rememberMe) {
        localStorage.setItem('interact_auth_token', data.access_token);
      } else {
        sessionStorage.setItem('interact_auth_token', data.access_token);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    authError,
    setAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
