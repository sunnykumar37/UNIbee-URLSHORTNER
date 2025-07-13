import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import axios from "axios";
import { useDashboard } from "../context/DashboardContext";
import { useAuth } from "../contexts/AuthContext";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF"];

export default function HomePage() {
  const [tab, setTab] = useState("short");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addLink, addQrCode } = useDashboard();
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const { isAuthenticated } = useAuth();
  const [shortUrl, setShortUrl] = useState("");
  const [barData, setBarData] = useState([
    { name: "Short Links", value: 0 },
    { name: "QR Codes", value: 0 },
  ]);
  const [pieData, setPieData] = useState([
    { name: "Desktop", value: 0 },
    { name: "Mobile", value: 0 },
    { name: "Tablet", value: 0 },
    { name: "Unknown", value: 0 },
  ]);
  const [qrCode, setQrCode] = useState("");

  const fetchSummary = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/links/summary-analytics", {
        headers: { "x-auth-token": token },
      });
      const data = await res.json();
      setBarData([
        { name: "Short Links", value: data.shortLinksCount },
        { name: "QR Codes", value: data.qrCodesCount },
      ]);
      setPieData(data.deviceData);
    } catch (err) {
      setBarData([
        { name: "Short Links", value: 0 },
        { name: "QR Codes", value: 0 },
      ]);
      setPieData([
        { name: "Desktop", value: 0 },
        { name: "Mobile", value: 0 },
        { name: "Tablet", value: 0 },
        { name: "Unknown", value: 0 },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (tab === "short") {
        // Use isAuthenticated instead of just checking token
        const token = localStorage.getItem("token");
        if (!isAuthenticated || !token) {
          setError("Please log in to create short links");
          setLoading(false);
          return;
        }

        // Create a new short link via API
        const res = await axios.post(
          "http://localhost:5000/api/links",
          { originalUrl: url },
          {
            headers: {
              "x-auth-token": token,
            },
          }
        );
        addLink(res.data); // Add to dashboard context
        setShortUrl(res.data.shortenedUrl); // Show the short URL
        setQrCode(res.data.qrCode || ""); // Show the QR code if present
        setUrl(""); // Clear input
      } else if (tab === "qr") {
        // Create a new QR code in the backend
        const token = localStorage.getItem("token");
        if (!isAuthenticated || !token) {
          setError("Please log in to create QR codes");
          setLoading(false);
          return;
        }
        try {
          await axios.post(
            "http://localhost:5000/api/links/qr",
            { text: url },
            {
              headers: {
                "x-auth-token": token,
              },
            }
          );
          fetchSummary(); // Refresh bar/pie chart after QR creation
        } catch (err) {
          setError(err.response?.data?.message || "Failed to create QR code");
        }
        setShortUrl(""); // Clear shortUrl if QR
        setUrl(""); // Clear input
      }
    } catch (err) {
      console.error("Error during quick create:", err.response?.data || err);
      if (err.response?.status === 401) {
        setError("Please log in to create short links");
      } else {
        setError(err.response?.data?.message || "Failed to create");
      }
      setShortUrl(""); // Clear shortUrl on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontWeight: 700, marginBottom: 24 }}>
        Your Connections Platform
      </h2>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          padding: 32,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 20, color: "black" }}>
              Quick create
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setTab("short")}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "none",
                background: tab === "short" ? "#e6f0ff" : "#f4f4f4",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔗 Short link
            </button>
            <button
              onClick={() => setTab("qr")}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "none",
                background: tab === "qr" ? "#e6f0ff" : "#f4f4f4",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {" "}
              QR Code
            </button>
          </div>
        </div>
        <form onSubmit={handleQuickCreate} style={{ display: "flex", gap: 12 }}>
          <input
            type="text"
            placeholder="https://example.com/my-long-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={loading}
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
            disabled={loading || !url}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: 16,
              cursor: loading || !url ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Creating..."
              : tab === "short"
              ? "Create your Unilink"
              : "Create QR Code"}
          </button>
        </form>
        {shortUrl && (
          <div style={{ color: "green", marginTop: 12 }}>
            Short URL: <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
            {qrCode && (
              <div style={{ marginTop: 12 }}>
                <img src={qrCode} alt="QR Code" style={{ width: 128, height: 128 }} />
              </div>
            )}
          </div>
        )}
        {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
      </div>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px #0001",
            padding: 24,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            Links & QR Codes Created
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px #0001",
            padding: 24,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            Clicks by Device
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      hoveredIndex === -1
                        ? COLORS[index % COLORS.length] // All opaque if no hover
                        : index === hoveredIndex
                        ? COLORS[index % COLORS.length] // Hovered is opaque
                        : `${COLORS[index % COLORS.length]}80` // Others translucent
                    }
                    outerRadius={index === hoveredIndex ? 90 : 80} // Pop out effect
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(-1)}
                  />
                ))}
              </Pie>
              {hoveredIndex !== -1 && pieData[hoveredIndex] && (
                <g>
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#222"
                    fontWeight={600}
                    fontSize={24}
                  >
                    {pieData[hoveredIndex].value}
                  </text>
                  <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#666"
                    fontSize={16}
                  >
                    {pieData[hoveredIndex].name}
                  </text>
                </g>
              )}
              <Tooltip />
              <Legend align="right" verticalAlign="middle" layout="vertical" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Getting started with Unibee Section */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 24,
          marginTop: 32,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 24,
            color: "black",
          }}
        >
          Getting started with Unibee
        </h2>

        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ color: "black" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 8,
                color: "black",
              }}
            >
              Make a Unibee Link.
            </div>
            <Link to="/dashboard/links" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  background: "#fff",
                  color: "blue",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span role="img" aria-label="link">
                  🔗
                </span>{" "}
                Create a link
              </button>
            </Link>
          </div>
        </div>

        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 8,
                color: "black",
              }}
            >
              Make a Unibee Code.
            </div>
            <Link to="/dashboard/qr-codes" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "1px solid #2563eb",
                  background: "#fff",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span role="img" aria-label="qr code">
                  &#128290;
                </span>{" "}
                Create a QR Code
              </button>
            </Link>
          </div>
        </div>

        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 8,
                color: "black",
              }}
            >
              Check out Unibee Analytics:
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Link
                to="/dashboard/analytics"
                style={{ textDecoration: "none" }}
              >
                <button
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: "1px solid #2563eb",
                    background: "#fff",
                    color: "#2563eb",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span role="img" aria-label="analytics">
                    📊
                  </span>{" "}
                  View Analytics demo
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
