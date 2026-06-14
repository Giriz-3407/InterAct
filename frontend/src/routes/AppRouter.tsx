import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RoomPage } from '../pages/RoomPage';
import { HistoryPage } from '../pages/HistoryPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={ROUTES.LANDING} element={<LandingPage />} />
      <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
      <Route path={ROUTES.ROOM} element={<RoomPage />} />
      <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
};
