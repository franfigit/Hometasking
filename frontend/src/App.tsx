import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { Layout } from './components/Layout';
import { ProfileSelector } from './components/ProfileSelector';
import { DashboardPage } from './pages/DashboardPage';
import { QrQuickActionPage } from './pages/QrQuickActionPage';
import { TasksManagePage } from './pages/TasksManagePage';
import { QrSheetPage } from './pages/QrSheetPage';
import { StatsPage } from './pages/StatsPage';
import { ResidentsPage } from './pages/ResidentsPage';

const AppRoutes: React.FC = () => {
  const { currentResident, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Iniciando Hometasking...
      </div>
    );
  }

  // Si aún no eligió qué residente es en este navegador, mostramos el selector rápido
  // (incluso si entró escaneando un QR, tras elegir su perfil queda en la misma URL del QR)
  if (!currentResident) {
    return <ProfileSelector />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/qr/:code" element={<QrQuickActionPage />} />
        <Route path="/tasks" element={<TasksManagePage />} />
        <Route path="/qr-sheet" element={<QrSheetPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/residents" element={<ResidentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AppRoutes />
      </ProfileProvider>
    </BrowserRouter>
  );
};

export default App;
