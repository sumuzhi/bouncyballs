import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, theme as antTheme } from 'antd';
import Login from './pages/Login';
import GameHall from './pages/GameHall';
import GameViewer from './pages/GameViewer';
import api from './utils/api';
import styles from './App.module.less';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('playerToken');
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        if (!cancelled) setIsAuthenticated(false);
        return;
      }
      try {
        await api.get('/portal/auth/verify');
        if (!cancelled) setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        if (!cancelled) setIsAuthenticated(false);
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (isAuthenticated === null) {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const token = useMemo(() => ({
    colorPrimary: '#0f6d6b',
    colorInfo: '#0f6d6b',
    colorSuccess: '#2a9d8f',
    colorWarning: '#f2b24c',
    colorError: '#e26b5a',
    colorText: '#1b2b2a',
    colorTextSecondary: '#516463',
    colorBgBase: '#f7f3ea',
    colorBgContainer: 'rgba(255, 255, 255, 0.92)',
    colorBorder: 'rgba(15, 109, 107, 0.22)',
    colorPrimaryHover: '#0a4f52',
    colorPrimaryActive: '#084244',
    borderRadius: 14,
    controlHeight: 40,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
  }), []);

  return (
    <ConfigProvider
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token,
        components: {
          Button: {
            fontWeight: 600,
            primaryShadow: '0 10px 20px rgba(7, 37, 39, 0.22)',
            defaultShadow: '0 8px 18px rgba(7, 37, 39, 0.12)',
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(15, 109, 107, 0.18)',
          },
          Card: {
            borderRadius: 18,
          },
          Tabs: {
            inkBarColor: '#0f6d6b',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <GameHall />
            </ProtectedRoute>
          } />
          <Route path="/game/:gameId" element={
            <ProtectedRoute>
              <GameViewer />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
