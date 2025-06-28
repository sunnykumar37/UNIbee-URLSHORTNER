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
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
              id={`qr-container-${qr._id || qr.id}`}
            >
              <QRCode
                value={qr.text}
                size={150}
                level="H"
                includeMargin
                renderAs="canvas"
              />
              <div
                style={{
                  fontSize: 14,
                  color: "#666",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {qr.text}
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>
                {new Date(qr.createdAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleDeleteQr(qr._id || qr.id)}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
