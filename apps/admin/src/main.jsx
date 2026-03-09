import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { applyTheme, getStoredTheme } from './utils/theme';

applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/admin">
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7c3aed',
          colorInfo: '#7c3aed',
          colorSuccess: '#06b6d4',
          borderRadius: 10,
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
        },
      }}
    >
      <App />
    </ConfigProvider>
  </BrowserRouter>,
);
