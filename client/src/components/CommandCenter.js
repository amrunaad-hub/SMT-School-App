import React from 'react';
import { Link } from 'react-router-dom';

const CommandCenter = () => {
  const commandCenter = {
    metrics: [
      { label: 'Students Present Today', value: 1192, trend: '+3%', link: '/attendance' },
      { label: 'Fee Collection Today', value: '₹4,50,000', trend: '+8%', link: '/finance' },
      { label: 'Pending Fees', value: '₹1,20,000', trend: '-5%', link: '/finance' },
      { label: 'Staff Present', value: 38, trend: '+2%', link: '/hr' },
      { label: 'Upcoming Events', value: 3, trend: '+0', link: '/communication' },
      { label: 'Transport Alerts', value: 2, trend: '+1', link: '/transport' },
    ],
    advanced: [
      { label: 'Fee Default Risk', value: 'Moderate', detail: '12% of accounts flagged', link: '/finance' },
      { label: 'Attendance Trend', value: 'Stable', detail: 'Last 7 days avg 95.2%', link: '/attendance' },
    ],
  };

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

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2>Smart Dashboard • Command Center</h2>
        <p style={{ color: '#4b5563' }}>
          Real-time school analytics for attendance, finance, events, transport and operations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {commandCenter.metrics.map((metric) => (
            <Link key={metric.label} to={metric.link} style={cardStyle}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>{metric.label}</p>
              <p style={{ margin: '12px 0 0', fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{metric.value}</p>
              <p style={{ margin: '12px 0 0', color: '#2563eb' }}>{metric.trend}</p>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '24px' }}>
          {commandCenter.advanced.map((item) => (
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