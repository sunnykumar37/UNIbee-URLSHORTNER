import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import LinksPage from './pages/LinksPage';
import QrCodesPage from './pages/QrCodesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PagesPage from './pages/PagesPage';
import PageEditor from './pages/PageEditor';
import SettingsPage from './pages/SettingsPage';
import ProfileSettings from './components/ProfileSettings';
import SecuritySettings from './components/SecuritySettings';
import Home from './pages/Home';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';
import SplashCursor from './UI/SplashCursor.js';
// Protected Route component


function App() {
  return (
    <AuthProvider>
      <SplashCursor />
      <DashboardProvider>

        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
           
              <Route path="home" element={<HomePage />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="qr-codes" element={<QrCodesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="pages" element={<PagesPage />} />
              <Route path="pages/:pageId" element={<PageEditor />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="security" element={<SecuritySettings />} />
              </Route>
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App; 