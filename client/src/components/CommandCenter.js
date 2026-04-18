import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';

const metrics = [
  { label: 'Students Present Today', value: 1192, trend: '+3%', link: '/attendance' },
  { label: 'Fee Collection Today', value: '₹4,50,000', trend: '+8%', link: '/finance' },
  { label: 'Pending Fees', value: '₹1,20,000', trend: '-5%', link: '/finance' },
  { label: 'Staff Present', value: 38, trend: '+2%', link: '/hr' },
  { label: 'Upcoming Events', value: 3, trend: '+0', link: '/communication' },
  { label: 'Transport Alerts', value: 2, trend: '+1', link: '/transport' },
];

const advancedMetrics = [
  { label: 'Fee Default Risk', value: 'Moderate', detail: '12% of accounts flagged', link: '/finance' },
  { label: 'Attendance Trend', value: 'Stable', detail: 'Last 7 days avg 95.2%', link: '/attendance' },
];

const CommandCenter = () => {
  const [query, setQuery] = useState('');

  const cardStyle = {
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  };

  const filteredMetrics = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return metrics;
    return metrics.filter((metric) => {
      return metric.label.toLowerCase().includes(keyword) || String(metric.value).toLowerCase().includes(keyword);
    });
  }, [query]);

  const filteredAdvanced = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return advancedMetrics;
    return advancedMetrics.filter((item) => {
      return item.label.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword) || item.detail.toLowerCase().includes(keyword);
    });
  }, [query]);

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto', background: 'radial-gradient(circle at right top, #dbeafe 0%, #f8fafc 45%, #e0f2fe 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <div style={{ border: '2px solid #bfdbfe', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 70%, #f0fdfa 100%)', borderRadius: '18px', padding: '16px 18px', boxShadow: '0 10px 28px rgba(2, 132, 199, 0.12)' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Smart Dashboard • Command Center</h2>
          <p style={{ color: '#4b5563', marginTop: '8px', marginBottom: '10px' }}>
            Real-time school analytics for attendance, finance, events, transport and operations.
          </p>
          <SearchBar
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search analytics cards by keyword"
            maxWidth="430px"
            inputStyle={{ border: '1px solid #93c5fd' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {filteredMetrics.map((metric) => (
            <Link key={metric.label} to={metric.link} style={cardStyle}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>{metric.label}</p>
              <p style={{ margin: '12px 0 0', fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{metric.value}</p>
              <p style={{ margin: '12px 0 0', color: '#2563eb' }}>{metric.trend}</p>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '24px' }}>
          {filteredAdvanced.map((item) => (
            <Link key={item.label} to={item.link} style={{ ...cardStyle, background: '#f8fafc' }}>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>{item.label}</p>
              <p style={{ margin: '12px 0 0', fontSize: '1.8rem', fontWeight: '700' }}>{item.value}</p>
              <p style={{ margin: '10px 0 0', color: '#6b7280' }}>{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default CommandCenter;