import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Filter out Wujie's stopMainAppRun error
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('此报错可以忽略') || 
    event.message.includes('stopMainAppRun') ||
    event.message.includes("Cannot read properties of undefined (reading 'prototype')")
  )) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && (
    event.reason.message.includes('此报错可以忽略') || 
    event.reason.message.includes('stopMainAppRun') ||
    event.reason.message.includes("Cannot read properties of undefined (reading 'prototype')")
  )) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
    <App />
)
