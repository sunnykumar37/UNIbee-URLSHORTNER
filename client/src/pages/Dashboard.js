import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react'; // Import QRCode component
import copy from 'copy-to-clipboard'; // Import copy function
import '../styles/Dashboard.css'; // Import the new CSS file
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [longUrl, setLongUrl] = useState('');
  const [shortenedLinks, setShortenedLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trialTimeLeft, setTrialTimeLeft] = useState(null);
  const navigate = useNavigate();

  // Function to fetch existing links
  const fetchLinks = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Handle case where token is missing (shouldn't happen if route is protected)
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/links', {
        headers: {
          'x-auth-token': token
        }
      });
      setShortenedLinks(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching links:', err);
      setError('Failed to fetch links');
      setLoading(false);
    }
  };

  // Function to handle URL shortening
  const handleShortenUrl = async (e) => {
    e.preventDefault();
    setLoading(true); // Indicate loading
    setError(null); // Clear previous errors
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token missing.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/links', 
        { longUrl },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      // Add the newly created link to the beginning of the list
      setShortenedLinks([res.data, ...shortenedLinks]);
      setLongUrl(''); // Clear the input field
      setLoading(false);
    } catch (err) {
      console.error('Error shortening URL:', err.response.data);
      setError(err.response.data.msg || 'Failed to shorten URL');
      setLoading(false);
    }
  };

  // Function to handle copying the shortened URL
  const handleCopyClick = (shortenedUrl) => {
    copy(shortenedUrl);
    alert('Shortened URL copied to clipboard!'); // Provide user feedback
  };

  // Fetch links when the component mounts
  useEffect(() => {
    fetchLinks();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    const checkTrial = () => {
      const isTrial = localStorage.getItem('trialUser') === 'true';
      const trialStart = parseInt(localStorage.getItem('trialStart'), 10);
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
    <div className="dashboard-container">
      {trialTimeLeft !== null && (
        <div style={{ background: '#fbbf24', color: '#111', padding: '10px', textAlign: 'center', fontWeight: 600, fontSize: 16, borderRadius: 8, marginBottom: 16 }}>
          Trial time left: {Math.floor(trialTimeLeft / 60000)}:{String(Math.floor((trialTimeLeft % 60000) / 1000)).padStart(2, '0')} min
        </div>
      )}
      <div className="dashboard-header">
        <h2>Welcome to UNIbee Dashboard</h2>
        {/* You can add user's name here later if needed */}
      </div>

      <div className="link-creation-form">
        <h3>Shorten a new URL</h3>
        <form onSubmit={handleShortenUrl}>
          <input
            type="text"
            placeholder="Enter a long URL to shorten"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      <div className="links-list-section">
        <h3>Your Shortened Links</h3>
        {loading ? (
          <p>Loading links...</p>
        ) : shortenedLinks.length === 0 ? (
          <p>No links created yet.</p>
        ) : (
          <ul>
            {shortenedLinks.map(link => (
              <li key={link._id} className="link-item">
                <p>Original: <a href={link.originalUrl} target="_blank" rel="noopener noreferrer">{link.originalUrl}</a></p>
                <p>Shortened: 
                  <a href={link.shortenedUrl} target="_blank" rel="noopener noreferrer">{link.shortenedUrl}</a>
                  <button onClick={() => handleCopyClick(link.shortenedUrl)} style={{ marginLeft: '10px' }}>Copy</button>
                </p>
                {/* QR Code */}
                <div style={{ marginTop: '10px' }}>
                  <QRCode value={link.shortenedUrl} size={128} level="H" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 