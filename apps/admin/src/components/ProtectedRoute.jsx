import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import api from '../utils/api';

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null: checking, true: valid, false: invalid
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await api.get('/admin/auth/verify');
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F9FAFC' }}>
        <Spin size="large" tip="正在验证身份..." />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
