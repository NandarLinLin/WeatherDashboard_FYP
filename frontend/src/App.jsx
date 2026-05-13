/* Author: Nandar Lin */

import { Navigate, Route, Routes } from 'react-router-dom'
import { Box } from '@mui/material'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { useAuth } from './context/useAuth.js'

function App() {
  const { isLoggedIn } = useAuth()

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Navbar isLoggedIn={isLoggedIn} />
      <Box component="main" sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage isLoggedIn={isLoggedIn} />} />
          <Route
            path="/analytics"
            element={
              isLoggedIn ? <AnalyticsPage /> : <Navigate to="/register" replace state={{ from: '/analytics' }} />
            }
          />
          <Route
            path="/favorites"
            element={
              isLoggedIn ? <FavoritesPage /> : <Navigate to="/register" replace state={{ from: '/favorites' }} />
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      <Footer />
    </Box>
  )
}

export default App
