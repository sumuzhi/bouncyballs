import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import Login from './pages/Login';
import GameHall from './pages/GameHall';
import GameViewer from './pages/GameViewer';
import api from './utils/api';

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
      } catch (error) {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
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
  );
};

export default App;
