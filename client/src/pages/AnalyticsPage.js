import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import axios from 'axios';

const clicksScansByDeviceData = [
  { name: 'Desktop', value: 146 },
  { name: 'E-Reader', value: 101 },
  { name: 'Tablet', value: 70 },
  { name: 'Mobile', value: 50 },
  { name: 'Unknown', value: 14 },
];

const COLORS = ['#00C49F', '#FFBB28', '#0088FE', '#FF8042', '#A28DFF'];

export default function AnalyticsPage() {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [deviceData, setDeviceData] = useState([]);
  const [overTimeData, setOverTimeData] = useState([]);
  const [topDate, setTopDate] = useState(null);

  useEffect(() => {
    const fetchDeviceData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('http://localhost:5000/api/links/device-analytics', {
          headers: { 'x-auth-token': token }
        });
        setDeviceData(res.data);
      } catch (err) {
        setDeviceData([]);
      }
    };
    fetchDeviceData();
  }, []);

  useEffect(() => {
    const fetchOverTimeData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('http://localhost:5000/api/links/over-time-analytics', {
          headers: { 'x-auth-token': token }
        });
        // Format date for display (MM/DD)
        const formatted = res.data.overTime.map(item => ({
          date: new Date(item.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
          value: item.value
        }));
        setOverTimeData(formatted);
        setTopDate(res.data.top);
      } catch (err) {
        setOverTimeData([]);
        setTopDate(null);
      }
    };
    fetchOverTimeData();
  }, []);

  const handleDownload = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to download.');
      return;
    }

    // Get headers from the first object keys
    const headers = Object.keys(data[0]);

    // Format data into CSV string
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => headers.map(fieldName => row[fieldName]).join(',')) // Data rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      alert('Your browser does not support automatic downloads. Please save the content manually.');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, background: '#f7f9fb', minHeight: '100vh' }}>
      <div style={{ fontWeight: 700, fontSize: 32, marginBottom: 24, color: '#222' }}>Analytics</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Clicks + scans over time */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, color: '#222' }}>Clicks + scans over time</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleDownload(overTimeData, 'clicks_scans_over_time.csv')} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#00C49F" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top performing date by clicks + scans */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, color: '#222' }}>Top performing date by clicks + scans</h3>
            <button style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#222', marginBottom: 8 }}>📈</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#222', marginBottom: 4 }}>
              {topDate && topDate.date ? new Date(topDate.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'No data'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>
              {topDate && topDate.value ? `${topDate.value} Clicks + scans` : 'No data'}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {overTimeData.length > 0 ? `${overTimeData[0].date} - ${overTimeData[overTimeData.length-1].date}` : ''}
            </div>
          </div>
        </div>

        {/* Clicks + scans by device */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, color: '#222' }}>Clicks + scans by device</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleDownload(clicksScansByDeviceData, 'clicks_scans_by_device.csv')} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Array.isArray(deviceData) && deviceData.length > 0 ? deviceData : clicksScansByDeviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                dataKey="value"
              >
                {(Array.isArray(deviceData) && deviceData.length > 0 ? deviceData : clicksScansByDeviceData).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={hoveredIndex === -1 
                      ? COLORS[index % COLORS.length] // All opaque if no hover
                      : (index === hoveredIndex 
                          ? COLORS[index % COLORS.length] // Hovered is opaque
                          : `${COLORS[index % COLORS.length]}80`) // Others translucent
                    }
                    outerRadius={index === hoveredIndex ? 90 : 80} // Pop out effect
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(-1)}
                  />
                ))}
              </Pie>
              {hoveredIndex !== -1 && (Array.isArray(deviceData) && deviceData.length > 0 ? deviceData : clicksScansByDeviceData)[hoveredIndex] && (
                <g>
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill="#222" fontWeight={600} fontSize={24}>
                    {(Array.isArray(deviceData) && deviceData.length > 0 ? deviceData : clicksScansByDeviceData)[hoveredIndex].value}
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" fill="#666" fontSize={16}>
                    {(Array.isArray(deviceData) && deviceData.length > 0 ? deviceData : clicksScansByDeviceData)[hoveredIndex].name}
                  </text>
                </g>
              )}
              <Tooltip />
              <Legend align="right" verticalAlign="middle" layout="vertical" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 