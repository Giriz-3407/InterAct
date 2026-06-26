import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RoomPage } from '../pages/RoomPage';
import { HistoryPage } from '../pages/HistoryPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.LANDING} element={<LandingPage />} />

      {/* Guest-only Routes */}
      <Route path={ROUTES.LOGIN} element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path={ROUTES.SIGNUP} element={<GuestRoute><SignupPage /></GuestRoute>} />

      {/* Protected Routes */}
      <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path={ROUTES.ROOM} element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      <Route path={ROUTES.HISTORY} element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
};
