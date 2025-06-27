import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css'; // We will create this CSS file next
import { FaHome, FaLink, FaQrcode, FaChartBar, FaSignOutAlt, FaFileAlt, FaCog } from 'react-icons/fa';
// import { useDashboard } from '../context/DashboardContext';

import axios from 'axios';
// Define sidebar navigation links
export const sidebarLinks = [
  { name: 'Home', path: '/dashboard/home', icon: FaHome },
  { name: 'Links', path: '/dashboard/links', icon: FaLink },
  { name: 'QR Codes', path: '/dashboard/qr-codes', icon: FaQrcode },
  { name: 'Pages', path: '/dashboard/pages', icon: FaFileAlt },
  { name: 'Analytics', path: '/dashboard/analytics', icon: FaChartBar },
];

export default function Sidebar({ onSignOut }) {
  const location = useLocation(); // Get current location
  // const { pages } = useDashboard();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const navigate = useNavigate();
  const toggleSettings = () => {
    setIsSettingsExpanded(!isSettingsExpanded);
  };

  const LogoutHandler = async () => {
  try {
    console.log("click on the signout button");
    const res = await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true }); // Make sure credentials are sent
    if (res.data.success) {
      navigate("/login");
      console.log("success ke andar hu");
    }
  } catch (error) {
    console.log("error in the logout api in frontend", error);
  }
};


  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {/* UNIbee logo or project name */}
        <Link to="/" className="sidebar-logo">
          UNIbee
        </Link>
      </div>
      <ul className="sidebar-nav">
        {sidebarLinks.map((link) => (
          <li key={link.name}>
            <Link
              to={link.path}
              className={location.pathname === link.path || (link.name === 'Home' && location.pathname === '/dashboard') ? 'active' : ''}
            >
              <link.icon className="sidebar-icon" /> {link.name}
            </Link>
          </li>
        ))}
        {/* Settings Dropdown */}
        <li className={`sidebar-dropdown-toggle ${isSettingsExpanded || location.pathname.startsWith('/dashboard/settings') ? 'active' : ''}`}>
          <button
            type="button"
            onClick={toggleSettings}
            className={location.pathname.startsWith('/dashboard/settings') ? 'active' : ''}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 20, font: 'inherit', display: 'flex', alignItems: 'center' }}
          >
            <FaCog className="sidebar-icon" /> Settings
          </button>
          {isSettingsExpanded && (
            <ul className="sidebar-submenu">
              <li>
                <Link to="/dashboard/settings/profile" className={location.pathname === '/dashboard/settings/profile' ? 'active' : ''}>
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/dashboard/settings/security" className={location.pathname === '/dashboard/settings/security' ? 'active' : ''}>
                  Security
                </Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
      {/* Sign Out Button/Link at the bottom */}
      <div className="sidebar-footer">
         <button onClick={LogoutHandler} className="sign-out-button"><FaSignOutAlt className="sidebar-icon" /> Sign Out</button>
      </div>
    </div>
  );
} 