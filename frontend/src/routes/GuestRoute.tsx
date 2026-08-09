import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { BrandedLoader } from '../components/BrandedLoader';

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <BrandedLoader />;
  }

  if (isAuthenticated) {
    const fromState = (location.state as { from?: Location })?.from;
    const targetUrl = fromState
      ? `${fromState.pathname}${fromState.search || ''}`
      : sessionStorage.getItem('redirect_after_login');

    if (targetUrl) {
      sessionStorage.removeItem('redirect_after_login');
      return <Navigate to={targetUrl} replace />;
    }

    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};
