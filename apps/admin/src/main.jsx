import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/admin">
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#9D84FF',
          borderRadius: 8,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </BrowserRouter>,
);
