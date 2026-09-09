import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initGlobalErrorCapture } from '@/lib/errorCapture'

// Initialize global error capture (window.onerror + unhandledrejection) before render.
initGlobalErrorCapture();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)