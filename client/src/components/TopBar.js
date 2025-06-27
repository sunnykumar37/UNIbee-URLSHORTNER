import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Removed: import { Link } from 'react-router-dom';
import { sidebarLinks } from './Sidebar';
import '../styles/TopBar.css'; // We will create this CSS file next

export default function TopBar() {
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  const updateProfile = () => {
    const username = localStorage.getItem('username');
    const photo = localStorage.getItem('profilePhoto');
    console.log('TopBar.js - profilePhoto in updateProfile:', photo);
    if (username) {
      setLoggedInUsername(username);
    }
    if (photo) {
      setProfilePhoto(photo);
    }
  };

  useEffect(() => {
    updateProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      updateProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '';
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      console.log('handleSearchKeyPress - Enter pressed. Filtered Links:', filteredLinks);
      if (filteredLinks.length > 0) {
        navigate(filteredLinks[0].path);
      }
      setSearchQuery('');
      setFilteredLinks([]);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    console.log('handleSearchChange - Search Query:', query);

    if (query.length > 0) {
      const filtered = sidebarLinks.filter((link) =>
        link.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLinks(filtered);
      console.log('handleSearchChange - Filtered Links:', filtered);
    } else {
      setFilteredLinks([]);
      console.log('handleSearchChange - Filtered Links: (empty)');
    }
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    setShowSuggestions(false);
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {/* Search bar is on the right now */}
      </div>
      <div className="top-bar-right">
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyPress={handleSearchKeyPress}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          autoComplete="off"
        />
        {showSuggestions && filteredLinks.length > 0 && (
          <ul className="search-suggestions">
            {filteredLinks.map((link) => (
              <li key={link.path} onClick={() => {
                navigate(link.path);
                setSearchQuery('');
                setFilteredLinks([]);
                setShowSuggestions(false); // Hide suggestions on click
              }}>
                {link.name}
              </li>
            ))}
          </ul>
        )}
        {/* User info, upgrade, help, etc. */}
        {loggedInUsername && <span className="user-info">{loggedInUsername}</span>}
        {profilePhoto ? (
          <img src={profilePhoto} alt="Profile" className="profile-photo" />
        ) : (
          <div className="profile-initial-circle">
            {getInitial(loggedInUsername)}
          </div>
        )}
        {/* Added comment for search bar commit */}
      </div>
    </div>
  );
} 