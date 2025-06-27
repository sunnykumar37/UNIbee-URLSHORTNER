import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // Default to profile

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 , color: 'black'}}>
      <h2 style={{ fontWeight: 700, marginBottom: 24, color:'white' }}>Settings</h2>
      <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid #e0e0e0' }}>
        <Link 
          to="profile" 
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '10px 15px',
            textDecoration: 'none',
            color: activeTab === 'profile' ? '#2563eb' : '#666',
            fontWeight: activeTab === 'profile' ? '600' : 'normal',
            borderBottom: activeTab === 'profile' ? '2px solid #2563eb' : 'none',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          Profile
        </Link>
        <Link 
          to="security" 
          onClick={() => setActiveTab('security')}
          style={{
            padding: '10px 15px',
            textDecoration: 'none',
            color: activeTab === 'security' ? '#2563eb' : '#666',
            fontWeight: activeTab === 'security' ? '600' : 'normal',
            borderBottom: activeTab === 'security' ? '2px solid #2563eb' : 'none',
            transition: 'all 0.2s ease-in-out',
            marginLeft: 15,
          }}
        >
          Security
        </Link>
      </div>
      {/* This is where nested routes will render */}
      <Outlet />
    </div>
  );
} 