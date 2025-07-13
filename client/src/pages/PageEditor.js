import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import QRCode from 'qrcode.react';
import axios from 'axios';

export default function PageEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { pages, links, qrCodes, updatePage } = useDashboard();
  const [linkInput, setLinkInput] = useState('');
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [linkError, setLinkError] = useState(null);
  const [qrCodeError, setQrCodeError] = useState(null);

  const currentPage = pages.find(page => page.id === parseInt(pageId));

  const handleAddLinkToPage = async () => {
    setLinkError(null);
    if (!linkInput.trim()) return;

    const shortCodeOrUrl = linkInput.trim();
    let foundLink = null;

    // Try to find by full shortenedUrl or by shortCode
    foundLink = links.find(link =>
      link.shortenedUrl === shortCodeOrUrl ||
      link.shortenedUrl?.endsWith(`/${shortCodeOrUrl.split('/').pop()}`)
    );

    if (foundLink) {
      const newContent = [...(currentPage.content || [])];
      // Add link item
      newContent.push({
        type: 'link',
        id: foundLink._id,
        title: foundLink.title || foundLink.originalUrl,
        shortenedUrl: foundLink.shortenedUrl,
        originalUrl: foundLink.originalUrl,
      });
      // Try to find corresponding QR code for this link
      const foundQr = qrCodes.find(qr => qr.text === foundLink.shortenedUrl);
      if (foundQr) {
        newContent.push({
          type: 'qrCode',
          id: foundQr._id || foundQr.id,
          value: foundQr.text,
          text: foundQr.text,
        });
      }
      updatePage(currentPage.id, { content: newContent });
      setLinkInput('');
    } else {
      setLinkError('Link not found. Please ensure it\'s a valid Unibee link.');
    }
  };

  const handleAddQrCodeToPage = () => {
    setQrCodeError(null);
    if (!qrCodeInput.trim()) return;

    const foundQrCode = qrCodes.find(qr => qr.text === qrCodeInput.trim() || qr.value === qrCodeInput.trim());

    if (foundQrCode) {
      const newContentItem = {
        type: 'qrCode',
        id: foundQrCode.id,
        value: foundQrCode.value,
        text: foundQrCode.text,
      };
      const updatedContent = [...(currentPage.content || []), newContentItem];
      updatePage(currentPage.id, { content: updatedContent });
      setQrCodeInput('');
    } else {
      setQrCodeError('QR Code not found. Please ensure it\'s a valid QR code from your collection.');
    }
  };

  const handleRemoveContent = (contentId) => {
    const updatedContent = currentPage.content.filter(item => item.id !== contentId);
    updatePage(currentPage.id, { content: updatedContent });
  };

  if (!currentPage) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Page Not Found</h2>
        <button
          onClick={() => navigate('/dashboard/pages')}
          style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
        >
          Go to Pages
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>{currentPage.name}</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>Created: {new Date(currentPage.createdAt).toLocaleString()}</p>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32, marginBottom: 32 }}>
        <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Add Links and QR Codes to this Page</h3>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>Add Link</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter Unibee link short code or full URL"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
            <button
              onClick={handleAddLinkToPage}
              style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Add Link
            </button>
          </div>
          {linkError && <p style={{ color: 'red', marginTop: 8 }}>{linkError}</p>}
        </div>

        {/* Remove the Add QR Code input for links */}

        <h3 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Content on this Page</h3>
        {(currentPage.content && currentPage.content.length > 0) ? (
          <ul>
            {currentPage.content.map(item => (
              <li key={item.id} style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  {item.type === 'link' ? (
                    <>
                      <h4 style={{ fontWeight: 600, fontSize: 16 }}>{item.title}</h4>
                      <p style={{ fontSize: 14, color: '#2563eb' }}><a href={item.shortenedUrl} target="_blank" rel="noopener noreferrer">Unibee/{item.shortenedUrl?.split('/').pop()}</a></p>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <QRCode value={item.value} size={80} level="H" />
                      <p style={{ fontSize: 14, wordBreak: 'break-all' }}>{item.text}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveContent(item.id)}
                  style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No content added to this page yet.</p>
        )}
      </div>
    </div>
  );
} 