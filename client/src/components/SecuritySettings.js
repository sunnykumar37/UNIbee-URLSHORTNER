import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      };

      const body = { currentPassword, newPassword };
      const res = await axios.put('http://localhost:5000/api/auth/password', body, config);

      setSuccess(res.data.msg + ' Redirecting to login...');
      
      // Clear only the token and isLoggedIn to force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('password'); // Remove the dummy password if it exists

      // Wait for 2 seconds to show success message
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err.response.data);
      setError(err.response.data.msg || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32, marginBottom: 24 }}>
      <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 24 }}>Security Settings</h3>
      <form onSubmit={handleSubmit}>
        {/* The current password field should always be present as we are now authenticating against backend */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            required
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            required
          />
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Password must be at least 8 characters long and contain uppercase, lowercase, and numbers
          </p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            required
          />
        </div>
        {error && (
          <div style={{ color: '#dc2626', marginBottom: 16, padding: 8, background: '#fee2e2', borderRadius: 4 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: '#059669', marginBottom: 16, padding: 8, background: '#d1fae5', borderRadius: 4 }}>
            {success}
          </div>
        )}
        <button
          type="submit"
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Update Password
        </button>
      </form>
    </div>
  );
} 