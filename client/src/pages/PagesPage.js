import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useNavigate } from 'react-router-dom';

export default function PagesPage() {
  const [pageName, setPageName] = useState('');
  const { pages, addPage, deletePage } = useDashboard();
  const navigate = useNavigate();

  const handleCreatePage = (e) => {
    e.preventDefault();
    if (!pageName.trim()) return;

    const newPage = {
      id: Date.now(), // Unique ID for the page
      name: pageName.trim(),
      content: [], // This will later hold links, QR codes, etc.
      createdAt: new Date().toISOString(),
    };

    addPage(newPage);
    setPageName('');
    navigate(`/dashboard/pages/${newPage.id}`); // Navigate to the newly created page
  };

  const handleDeletePage = (idToDelete) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      deletePage(idToDelete);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Create a Page</h2>
      
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32, marginBottom: 32 }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 , color:"black"}}>Claim your URL</div>
        <form onSubmit={handleCreatePage} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16 }}>
            <option>Unibee</option>
          </select>
          <input
            type="text"
            placeholder="your name or business"
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            required
            style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16 }}
          />
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Create page
          </button>
        </form>
      </div>

      <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Your Unibee Pages</div>
      
      {pages.length === 0 ? (
        <p>No pages created yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {pages.map(page => (
            <div 
              key={page.id} 
              style={{ 
                background: '#fff', 
                borderRadius: 12, 
                boxShadow: '0 2px 8px #0001', 
                padding: 20, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12 
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{page.name}</h3>
              <p style={{ fontSize: 14, color: '#666' }}>Created: {new Date(page.createdAt).toLocaleDateString()}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => navigate(`/dashboard/pages/${page.id}`)}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  View Page
                </button>
                <button
                  onClick={() => handleDeletePage(page.id)}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 