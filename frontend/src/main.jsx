/* Author: Nandar Lin */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline } from '@mui/material'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AppTheme from './theme/AppTheme.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppTheme>
          <CssBaseline />
          <App />
        </AppTheme>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
