import React, { useState, useEffect } from 'react';

export default function ProfileSettings() {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem('username');
    const savedPhoto = localStorage.getItem('profilePhoto');
    if (savedName) {
      setName(savedName);
    }
    if (savedPhoto) {
      setPhoto(savedPhoto);
      setPreviewUrl(savedPhoto);
    }
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPhoto(base64String);
        setPreviewUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('username', name);
    if (photo) {
      localStorage.setItem('profilePhoto', photo);
    }
    // Trigger a custom event to notify other components about the profile update
    window.dispatchEvent(new Event('profileUpdated'));
    alert('Profile updated successfully!');
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32, marginBottom: 24 }}>
      <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 24 }}>Profile Settings</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            required
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>Profile Photo</label>
          {previewUrl && (
            <div style={{ marginBottom: 10 }}>
              <img 
                src={previewUrl} 
                alt="Profile preview" 
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '2px solid #2563eb'
                }} 
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ border: '1px solid #ccc', padding: 8, borderRadius: 6, width: '100%' }}
          />
        </div>
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
          Save Changes
        </button>
      </form>
    </div>
  );
} 