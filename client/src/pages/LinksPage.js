import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import copy from 'copy-to-clipboard'; // Import copy function
import { useDashboard } from '../context/DashboardContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css'; // Import the new CSS file
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Helper to fetch page title from a URL
async function fetchPageTitle(url) {
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    const html = await response.text();
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

// Helper to get favicon from a URL
function getFavicon(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}`;
  } catch {
    return '';
  }
}

export default function LinksPage() { // Renamed component
  const [longUrl, setLongUrl] = useState('');
  const [shortenedLinks, setShortenedLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState({ open: false, link: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, link: null });
  const { addLink, qrCodes, addQrCode, deleteQrCode } = useDashboard(); // Destructure qrCodes, addQrCode, deleteQrCode
  const navigate = useNavigate();
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [linkStatus, setLinkStatus] = useState({}); // {id: 'active'|'hidden'}
  const [showFilter, setShowFilter] = useState('Active');
  const [editModal, setEditModal] = useState({ open: false, link: null });
  const [editFields, setEditFields] = useState({ title: '', destination: '', backHalf: '' });
  const [editLoading, setEditLoading] = useState(false);

  const handleViewQr = (link) => {
    const shortCode = link.shortenedUrl?.split('/').pop();
    const qrCodeValue = `http://localhost:5000/${shortCode}`;
    const existingQrCode = qrCodes.find(qr => qr.value === qrCodeValue);

    if (!existingQrCode) {
      // Only add if it doesn't already exist in the dashboard context
      const newQrData = {
        id: `qr-${shortCode}`,
        value: qrCodeValue,
        text: link.title || link.originalUrl,
        createdAt: new Date().toISOString()
      };
      addQrCode(newQrData);
    }
    setSelectedLinks([link]);
    setShowQrModal(true);
  };

  const handleDeleteQr = (qrCodeId) => {
    deleteQrCode(qrCodeId);
    setShowQrModal(false);
  };

  // Function to fetch existing links
  const fetchLinks = async () => {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage in fetchLinks:', token);
    if (!token) {
      // Handle case where token is missing (shouldn't happen if route is protected)
      console.warn('No token found in localStorage. Cannot fetch links.');
      return;
    }
    setLoading(true);
    try {
      console.log('Sending request to /api/links with token:', token);
      const res = await axios.get('http://localhost:5000/api/links', {
        headers: {
          'x-auth-token': token
        }
      });
      setShortenedLinks(res.data);
      // No need to manually add to dashboard context if fetchLinks is the primary source
      // of truth for links. The dashboard context should ideally subscribe to this state.
      // If addLink is used elsewhere, ensure it handles duplicates or updates.
      setLoading(false);
    } catch (err) {
      console.error('Error fetching links:', err);
      setLoading(false);
    }
  };

  // Function to handle URL shortening
  const handleShortenUrl = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/links', 
        { originalUrl: longUrl },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      
      // Use the full shortened URL provided by the server
      const fullShortenedUrl = res.data.shortenedUrl;

      // Temporarily remove fetching page title to isolate error
      const newLink = { ...res.data, shortenedUrl: fullShortenedUrl };
      setShortenedLinks([newLink, ...shortenedLinks]);
      addLink(newLink);
      setLongUrl('');
      setLoading(false);
    } catch (err) {
      console.error('Error shortening URL:', err.response?.data || err);
      alert(err.response?.data?.message || 'Failed to shorten URL');
      setLoading(false);
    }
  };

  // Function to handle copying the shortened URL
  const handleCopyClick = (shortenedUrl) => {
    copy(shortenedUrl);
    alert('Shortened URL copied to clipboard!'); // Provide user feedback
  };

  const handleShare = (shortenedUrl) => {
    if (navigator.share) {
      navigator.share({ url: shortenedUrl });
    } else {
      alert('Share not supported on this browser.');
    }
  };

  const handleEdit = (link) => {
    const shortCode = link.shortenedUrl?.split('/').pop() || '';
    setEditFields({
      title: link.title || '',
      destination: link.originalUrl || '',
      backHalf: shortCode,
    });
    setEditModal({ open: true, link });
  };

  const handleEditFieldChange = (field, value) => {
    setEditFields({ ...editFields, [field]: value });
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put(`http://localhost:5000/api/links/${editModal.link._id}`, {
        title: editFields.title,
        longUrl: editFields.destination,
        shortCode: editFields.backHalf,
      }, {
        headers: { 'x-auth-token': token }
      });
      // Update the link in the list
      setShortenedLinks(shortenedLinks.map(l => l._id === editModal.link._id ? { ...l, ...res.data } : l));
      setEditModal({ open: false, link: null });
      setEditLoading(false);
    } catch (err) {
      alert('Failed to update link.');
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => setEditModal({ open: false, link: null });

  const handleEditDelete = async () => {
    setEditLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/links/${editModal.link._id}`, {
        headers: { 'x-auth-token': token }
      });
      setShortenedLinks(shortenedLinks.filter(l => l._id !== editModal.link._id));
      setEditModal({ open: false, link: null });
      setEditLoading(false);
    } catch (err) {
      alert('Failed to delete link.');
      setEditLoading(false);
    }
  };

  const handleDelete = (linkId) => {
    const link = shortenedLinks.find(l => l._id === linkId);
    setDeleteConfirm({ open: true, link });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.link) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/links/${deleteConfirm.link._id}`, {
        headers: { 'x-auth-token': token }
      });
      setShortenedLinks(shortenedLinks.filter(l => l._id !== deleteConfirm.link._id));
      setDeleteConfirm({ open: false, link: null });
    } catch (err) {
      alert('Failed to delete link.');
      setDeleteConfirm({ open: false, link: null });
    }
  };

  const cancelDelete = () => setDeleteConfirm({ open: false, link: null });

  const handleViewDetails = (link) => {
    setShowDetailsModal({ open: true, link });
    setShowDropdown({});
  };

  const handleCreateUnibeePage = () => {
    navigate('/dashboard/pages');
    setShowDropdown({});
  };

  const handleDropdownToggle = (linkId) => {
    setShowDropdown(prev => ({ ...prev, [linkId]: !prev[linkId] }));
  };

  const handleDropdownClose = () => {
    setShowDropdown({});
  };

  const handleSelectLink = (id) => {
    setSelectedLinks(selectedLinks.includes(id)
      ? selectedLinks.filter(lid => lid !== id)
      : [...selectedLinks, id]);
  };

  const handleSelectAll = () => {
    if (selectedLinks.length === shortenedLinks.length) setSelectedLinks([]);
    else setSelectedLinks(shortenedLinks.map(l => l._id));
  };

  const handleHideLinks = () => {
    const updated = { ...linkStatus };
    selectedLinks.forEach(id => { updated[id] = 'hidden'; });
    setLinkStatus(updated);
    setSelectedLinks([]);
  };

  const handleShowLinks = () => {
    const updated = { ...linkStatus };
    selectedLinks.forEach(id => { updated[id] = undefined; }); // Remove 'hidden' status
    setLinkStatus(updated);
    setSelectedLinks([]);
  };

  // Fetch links when the component mounts
  useEffect(() => {
    console.log('LinksPage useEffect: Fetching links...');
    fetchLinks();
    // Close dropdown on click outside
    const handleClick = (e) => {
      if (!e.target.closest('.more-dropdown')) setShowDropdown({});
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, background: '#f7f9fb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 32, color: '#222', flex: 1 }}>Unibee Links</div>
      </div>
      {/* Top bar */}
      <form onSubmit={handleShortenUrl} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search links or paste a long URL to shorten"
          value={longUrl}
          onChange={e => setLongUrl(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16, background: '#fff' }}
          required
        />
        <button type="submit" disabled={loading || !longUrl} style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: loading || !longUrl ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating...' : 'Create link'}
        </button>
      </form>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input type="checkbox" checked={selectedLinks.length === shortenedLinks.length && shortenedLinks.length > 0} onChange={handleSelectAll} style={{ width: 18, height: 18 }} />
        <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 15 }}>{selectedLinks.length} selected</span>
        <button onClick={handleHideLinks} disabled={selectedLinks.length === 0} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: selectedLinks.length === 0 ? 'not-allowed' : 'pointer' }}>Hide</button>
        <button onClick={handleShowLinks} disabled={selectedLinks.length === 0} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: selectedLinks.length === 0 ? 'not-allowed' : 'pointer' }}>Active</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 15 }}>Show:</span>
          <select value={showFilter} onChange={e => setShowFilter(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', fontSize: 15 }}>
            <option>Active</option>
            <option>Hidden</option>
          </select>
        </div>
      </div>
      {/* Link cards */}
      <div style={{ marginTop: 8 }}>
        {loading ? (
          <p>Loading links...</p>
        ) : shortenedLinks.length === 0 ? (
          <p>No links created yet.</p>
        ) : (
          <div>
            {shortenedLinks.filter(link => (showFilter === 'Active' ? linkStatus[link._id] !== 'hidden' : linkStatus[link._id] === 'hidden')).map(link => (
              <div key={link._id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', padding: 28, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative', opacity: linkStatus[link._id] === 'hidden' ? 0.5 : 1 }}>
                <input type="checkbox" checked={selectedLinks.includes(link._id)} onChange={() => handleSelectLink(link._id)} style={{ marginTop: 8, width: 18, height: 18 }} />
                {/* Icon */}
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#2563eb' }}>
                  {link.originalUrl && (
                    <img src={getFavicon(link.originalUrl)} alt="favicon" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  )}
                </div>
                {/* Main content */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 20, color: '#222', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {link.title || 'Untitled'}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 16, color: '#2563eb', marginBottom: 2 }}>
                    {/* Show UNIbee as the domain, but keep the real link */}
                    <a href={link.shortenedUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#2563eb' }}>
                      {link.shortenedUrl.replace('http://localhost:5000', 'UNIbee')}
                    </a>
                  </div>
                  <div style={{ color: '#444', fontSize: 15, marginBottom: 8, wordBreak: 'break-all' }}>
                    <a href={link.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#444', textDecoration: 'underline' }}>{link.originalUrl}</a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#6b7280', fontSize: 14, marginTop: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span role="img" aria-label="calendar">📅</span> {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                {/* Actions - horizontal */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', marginLeft: 12 }}>
                  <button onClick={() => handleCopyClick(link.shortenedUrl)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Copy</button>
                  <button onClick={() => handleShare(link.shortenedUrl)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Share</button>
                  <button onClick={() => handleEdit(link)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>✏️</button>
                  <div style={{ position: 'relative' }} className="more-dropdown">
                    <button onClick={e => { e.stopPropagation(); handleDropdownToggle(link._id); }} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #2563eb', borderRadius: 6, padding: '6px 16px', fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>⋯</button>
                    {showDropdown[link._id] && (
                      <div style={{ position: 'absolute', top: 40, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px #0002', zIndex: 10, minWidth: 200, padding: 8 }}>
                        <div onClick={() => { handleDelete(link._id); handleDropdownClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 6, fontWeight: 500, color: '#e53935' }}>
                          <span role="img" aria-label="delete">🗑️</span> Delete
                        </div>
                        <div onClick={() => { handleViewDetails(link); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 6, fontWeight: 500 }}>
                          <span role="img" aria-label="details">🔗</span> View link details
                        </div>
                        <div onClick={() => { handleViewQr(link); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 6, fontWeight: 500 }}>
                          <span role="img" aria-label="qr">🔗</span> View QR Code
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* QR Modal */}
      {showQrModal && selectedLinks.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg shadow-lg mb-4">
                <QRCodeSVG
                  value={selectedLinks[0].shortenedUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const canvas = document.createElement('canvas');
                    const svg = document.querySelector('svg');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.drawImage(img, 0, 0);
                      const pngUrl = canvas.toDataURL('image/png');
                      const link = document.createElement('a');
                      link.download = `qrcode-${selectedLinks[0].shortenedUrl?.split('/').pop()}.png`;
                      link.href = pngUrl;
                      link.click();
                    };
                    img.src = url;
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDeleteQr(selectedLinks[0].shortenedUrl?.split('/').pop())}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete QR
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {showDetailsModal.open && showDetailsModal.link && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDetailsModal({ open: false, link: null })}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 600, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDetailsModal({ open: false, link: null })} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 28, marginBottom: 8 }}>{showDetailsModal.link.title || 'Untitled'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#2563eb' }}>
                {showDetailsModal.link.originalUrl && (
                  <img src={getFavicon(showDetailsModal.link.originalUrl)} alt="favicon" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                )}
              </div>
              <div>
                <a href={showDetailsModal.link.shortenedUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600, fontSize: 18 }}>{showDetailsModal.link.shortenedUrl}</a>
                <div style={{ color: '#444', fontSize: 15, marginTop: 4, wordBreak: 'break-all' }}>
                  <a href={showDetailsModal.link.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#444', textDecoration: 'underline' }}>{showDetailsModal.link.originalUrl}</a>
                </div>
              </div>
            </div>
            <div style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>{showDetailsModal.link.description || ''}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#6b7280', fontSize: 15, marginBottom: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span role="img" aria-label="calendar">📅</span> {showDetailsModal.link.createdAt ? new Date(showDetailsModal.link.createdAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <button onClick={() => handleCopyClick(showDetailsModal.link.shortenedUrl)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 20px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Copy</button>
              <button onClick={() => handleShare(showDetailsModal.link.shortenedUrl)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 20px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Share</button>
              <button onClick={() => handleEdit(showDetailsModal.link)} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 20px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>✏️ Edit</button>
              <button onClick={() => handleDelete(showDetailsModal.link._id)} style={{ background: '#f3f4f6', color: '#e53935', border: '1px solid #e53935', borderRadius: 6, padding: '8px 20px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Delete</button>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 40, width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>QR Code</div>
                <QRCodeSVG value={showDetailsModal.link.shortenedUrl} size={120} level="H" />
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => handleDeleteQr(showDetailsModal.link.shortenedUrl?.split('/').pop())}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Delete QR
                  </button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Unibee Page</div>
                <button onClick={handleCreateUnibeePage} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Create Unibee Page</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editModal.open && editModal.link && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative' }}>
            <button onClick={handleEditCancel} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Edit link</div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Short link</div>
              <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 16 }}>Unibee/</span>
              <input value={editFields.backHalf} onChange={e => handleEditFieldChange('backHalf', e.target.value)} style={{ fontSize: 16, fontWeight: 600, border: 'none', borderBottom: '1px solid #2563eb', outline: 'none', width: 180, marginRight: 12 }} />
              <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', fontSize: 15, marginLeft: 8 }}>Edit back-half</button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Destination URL</div>
              <input value={editFields.destination} onChange={e => handleEditFieldChange('destination', e.target.value)} style={{ fontSize: 16, border: '1px solid #ccc', borderRadius: 6, padding: '8px 12px', width: 340 }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Title</div>
              <input value={editFields.title} onChange={e => handleEditFieldChange('title', e.target.value)} style={{ fontSize: 16, border: '1px solid #ccc', borderRadius: 6, padding: '8px 12px', width: 340 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <button onClick={handleEditSave} disabled={editLoading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Save</button>
              <button onClick={handleEditCancel} disabled={editLoading} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditDelete} disabled={editLoading} style={{ background: '#fff', color: '#e53935', border: '1px solid #e53935', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginLeft: 32 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      {deleteConfirm.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Delete Link?</div>
            <div style={{ color: '#444', marginBottom: 24, textAlign: 'center' }}>Are you sure you want to delete this link? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={confirmDelete} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Delete</button>
              <button onClick={cancelDelete} style={{ background: '#f3f4f6', color: '#222', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Info bar at the bottom */}
     
      <div style={{ textAlign: 'center', color: '#6b7280', margin: '32px 0 0 0', fontWeight: 500, fontSize: 15 }}>
        <span style={{ borderBottom: '1px solid #d1d5db', width: 120, display: 'inline-block', verticalAlign: 'middle', marginRight: 12 }}></span>
        You've reached the end of your links
        <span style={{ borderBottom: '1px solid #d1d5db', width: 120, display: 'inline-block', verticalAlign: 'middle', marginLeft: 12 }}></span>
      </div>
    </div>
  );
} 