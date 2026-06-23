import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { theme } from './theme';
import { useAuthStore } from './store/auth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clusters from './pages/Clusters';
import Nodes from './pages/Nodes';
import Images from './pages/Images';
import Inventory from './pages/Inventory';
import Transfer from './pages/Transfer';
import History from './pages/History';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0D1425',
            color: '#E2E8F0',
            border: '1px solid rgba(148,163,184,0.15)',
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#060B18' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#060B18' } },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clusters" element={<Clusters />} />
                  <Route path="/nodes" element={<Nodes />} />
                  <Route path="/images" element={<Images />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/transfer" element={<Transfer />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
