import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode.react";
import "../styles/Dashboard.css";

export default function QrCodesPage() {
  const [qrText, setQrText] = useState("");
  const [qrCodes, setQrCodes] = useState([]);
  const [pendingUpload, setPendingUpload] = useState(null);
  const qrRefs = useRef({});

  // 🔄 Fetch existing QR codes from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/qrcodes")
      .then((res) => res.json())
      .then((data) => setQrCodes(data))
      .catch((err) => console.error("❌ Fetch failed", err));
  }, []);

  // 🧠 Grab canvas after render using DOM
  useEffect(() => {
    qrCodes.forEach((qr) => {
      const canvas = document
        .getElementById(`qr-container-${qr._id || qr.id}`)
        ?.querySelector("canvas");

      if (canvas) {
        qrRefs.current[qr._id || qr.id] = canvas;
      }
    });
  }, [qrCodes]);

  // 🧠 Upload canvas to backend once ready
  useEffect(() => {
    if (!pendingUpload) return;

    const { id, text } = pendingUpload;
    const canvas = qrRefs.current[id];

    if (canvas) {
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append("qrImage", blob, `qrcode-${id}.png`);
        formData.append("text", text);

        try {
          const token = localStorage.getItem('token');
          if (token) {
            formData.append("token", token);
          }
          
          const res = await fetch("http://localhost:5000/api/upload-qr", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          alert("✅ Uploaded to Cloudinary!");
          console.log("✅", data.cloudinaryUrl);
        } catch (err) {
          console.error("❌ Upload failed", err);
          alert("❌ Upload failed");
        }
        setPendingUpload(null);
      });
    } else {
      setTimeout(() => setPendingUpload(pendingUpload), 100); // Retry if canvas not ready
    }
  }, [pendingUpload]);

  const handleCreateQR = (e) => {
    e.preventDefault();
    if (!qrText.trim()) return;

    const id = Date.now();
    const newQr = {
      id,
      text: qrText,
      createdAt: new Date().toISOString(),
    };

    setQrCodes((prev) => [newQr, ...prev]);
    setPendingUpload({ id, text: qrText });
    setQrText("");
  };

  const handleDeleteQr = async (idToDelete) => {
    if (!window.confirm("Are you sure you want to delete this QR code?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/qrcodes/${idToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ QR code deleted!");
        // Refetch the list
        const updated = await fetch("http://localhost:5000/api/qrcodes").then(r => r.json());
        setQrCodes(updated);
      } else {
        alert("❌ Delete failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Delete failed: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>
        Unibee Codes
      </h1>

      <form onSubmit={handleCreateQR} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Enter text or URL for QR code"
          value={qrText}
          onChange={(e) => setQrText(e.target.value)}
          required
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Generate QR Code
        </button>
      </form>

      <h2 style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Your QR Codes</h2>

      {qrCodes.length === 0 ? (
        <p>No QR codes created yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {qrCodes.map((qr) => (
            <div
              key={qr._id || qr.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 8px #0001",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* QR Image from cloudinaryUrl */}
              {qr.cloudinaryUrl ? (
                <img src={qr.cloudinaryUrl} alt="QR Code" style={{ width: 150, height: 150 }} />
              ) : (
                <div style={{ width: 150, height: 150, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Image</div>
              )}
              {/* Encoded value (text) as UNIbee/s/xxxxxx if it matches a short link */}
              <div style={{ fontSize: 14, color: "#2563eb", textAlign: "center", wordBreak: "break-all" }}>
                {qr.text.match(/https?:\/\/.+?\/s\/[a-zA-Z0-9]+/) ? qr.text.replace(/https?:\/\/.+?\/s\//, 'UNIbee/') : qr.text}
              </div>
              {/* Creation date */}
              <div style={{ fontSize: 12, color: "#999" }}>
                {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : 'N/A'}
              </div>
              {/* Download and Delete buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {qr.cloudinaryUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(qr.cloudinaryUrl, { mode: 'cors' });
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `qrcode-${qr._id || qr.id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        alert('Failed to download QR code image.');
                      }
                    }}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 16px",
                      fontWeight: 500,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to delete this QR code?')) return;
                    try {
                      const res = await fetch(`http://localhost:5000/api/qrcodes/${qr._id || qr.id}`, {
                        method: 'DELETE',
                      });
                      if (res.ok) {
                        setQrCodes(qrCodes.filter(q => (q._id || q.id) !== (qr._id || qr.id)));
                      } else {
                        alert('Failed to delete QR code.');
                      }
                    } catch (err) {
                      alert('Failed to delete QR code.');
                    }
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Delete QR Code"
                >
                  <span role="img" aria-label="delete">🗑️</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
