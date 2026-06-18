import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import posthog from 'posthog-js'

posthog.init('phc_AFQXLJ733zFpGqVjeS7D685D6YqobovzyesDG9sY5542', {
  api_host: window.location.origin + '/ingest',
  ui_host: 'https://us.posthog.com',
  capture_pageview: true,
  session_recording: { maskAllInputs: true }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
