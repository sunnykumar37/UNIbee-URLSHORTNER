import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import '../styles/DashboardLayout.css'; // We will create this CSS file next

export default function DashboardLayout({ onSignOut }) {
  const [trialTimeLeft, setTrialTimeLeft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTrial = () => {
      const isTrial = localStorage.getItem('trialUser') === 'true';
      const trialStart = parseInt(localStorage.getItem('trialStart'), 10);
      const token = localStorage.getItem('token');
      if (token) {
        setTrialTimeLeft(null);
        localStorage.removeItem('trialUser');
        localStorage.removeItem('trialStart');
        return;
      }
      if (isTrial && trialStart) {
        const now = Date.now();
        const timeLeft = 10 * 60 * 1000 - (now - trialStart);
        setTrialTimeLeft(timeLeft > 0 ? timeLeft : 0);
        if (timeLeft <= 0) {
          localStorage.removeItem('trialUser');
          localStorage.removeItem('trialStart');
          alert('Your trial has expired. Please log in to continue.');
          navigate('/login');
        }
      } else {
        setTrialTimeLeft(null);
      }
    };
    checkTrial();
    const interval = setInterval(checkTrial, 1000); // update every second
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="dashboard-layout">
      <TopBar />
      {trialTimeLeft !== null && (
        <div style={{ background: '#fbbf24', color: '#111', padding: '8px 18px', textAlign: 'center', fontWeight: 600, fontSize: 16, borderRadius: 8, margin: '16px 32px 0 32px' }}>
          Trial time left: {Math.floor(trialTimeLeft / 60000)}:{String(Math.floor((trialTimeLeft % 60000) / 1000)).padStart(2, '0')} min
        </div>
      )}
      <div className="dashboard-content-area">
        <Sidebar onSignOut={onSignOut} />
        <main className="dashboard-main-content main-content">
          <Outlet /> {/* Renders the matched nested route component */}
        </main>
      </div>
    </div>
  );
} 