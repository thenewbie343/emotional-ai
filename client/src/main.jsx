import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import posthog from 'posthog-js'

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

try {
  posthog.init('phc_AFQXLJ733zFpGqVjeS7D685D6YqobovzyesDG9sY5542', {
    api_host: API_BASE + '/ingest',
    ui_host: 'https://us.posthog.com',
    capture_pageview: true,
    session_recording: { maskAllInputs: true }
  })
} catch (err) {
  console.warn('[PostHog] Initialization failed or was blocked:', err);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Register service worker for background notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}
