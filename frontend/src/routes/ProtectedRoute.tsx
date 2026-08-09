import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { BrandedLoader } from '../components/BrandedLoader';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== ROUTES.LOGIN) {
      sessionStorage.setItem('redirect_after_login', location.pathname + location.search);
    }
  }, [isLoading, isAuthenticated, location]);

  if (isLoading) {
    return <BrandedLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
