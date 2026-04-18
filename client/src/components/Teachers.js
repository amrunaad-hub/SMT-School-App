import React from 'react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { title: 'Class Timetable', description: 'View daily periods and teacher allocations.', to: '/timetable', color: '#1d4ed8' },
  { title: 'Attendance', description: 'Mark and review student attendance records.', to: '/attendance', color: '#059669' },
  { title: 'Exams', description: 'Check assessment schedules and marks workflow.', to: '/exams', color: '#b45309' },
  { title: 'Communication', description: 'Send class circulars and parent messages.', to: '/communication', color: '#7c3aed' },
];

const Teachers = () => {
  return (
    <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <section style={{
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #bfdbfe',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
        boxShadow: '0 10px 22px rgba(30, 64, 175, 0.1)',
      }}>
        <h2 style={{ margin: 0, color: '#1e3a8a' }}>Teachers Portal</h2>
        <p style={{ margin: '8px 0 0', color: '#334155' }}>
          One place for faculty workflows: timetable, attendance, exams, and communication.
        </p>
      </section>

      <section style={{ marginTop: '18px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {quickLinks.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            style={{
              textDecoration: 'none',
              color: '#0f172a',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
              borderLeft: `6px solid ${item.color}`,
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h3>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#475569' }}>{item.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
};

export default Teachers;
