import React from 'react';
import { Link } from 'react-router-dom';

const modules = [
  { name: 'Command Center', path: '/command-center', description: 'Real-time school analytics', icon: '🎛️', color: '#1e40af' },
  { name: 'Student Information', path: '/sis', description: 'Manage student profiles', icon: '👥', color: '#2563eb' },
  { name: 'Fee Management', path: '/finance', description: 'Track fee collection', icon: '💰', color: '#059669' },
  { name: 'Admissions', path: '/admissions', description: 'Manage enrollments', icon: '📝', color: '#dc2626' },
  { name: 'Timetable', path: '/timetable', description: 'Schedule classes', icon: '⏰', color: '#7c3aed' },
  { name: 'Human Resources', path: '/hr', description: 'Manage staff', icon: '👔', color: '#ea580c' },
  { name: 'Exams', path: '/exams', description: 'Schedule examinations', icon: '📊', color: '#2dd4bf' },
  { name: 'Attendance', path: '/attendance', description: 'Track attendance', icon: '✅', color: '#10b981' },
  { name: 'Transport', path: '/transport', description: 'Manage transport', icon: '🚌', color: '#f59e0b' },
  { name: 'Inventory', path: '/inventory', description: 'Manage supplies', icon: '📦', color: '#3b82f6' },
  { name: 'Communication', path: '/communication', description: 'Announcements and messages', icon: '💬', color: '#ec4899' },
];

const cardStyle = (color) => ({
  padding: '24px',
  border: `2px solid ${color}20`,
  borderRadius: '16px',
  background: `linear-gradient(135deg, #ffffff 0%, ${color}05 100%)`,
  boxShadow: `0 4px 20px ${color}15`,
  cursor: 'pointer',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'all 0.3s ease',
  transform: 'translateY(0)',
  ':hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 28px ${color}25` },
});

const Dashboard = () => {
  return (
    <main style={{ padding: '28px', maxWidth: '1220px', margin: '0 auto', background: 'linear-gradient(to bottom, #f0f9ff 0%, #f3f4f6 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ fontSize: '2rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>📚 School ERP Dashboard</h2>
        <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '32px', fontWeight: '500' }}>
          Welcome to the professional School ERP system. Select a module to manage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {modules.map((module) => (
            <Link key={module.path} to={module.path} style={{...cardStyle(module.color), display: 'block'}}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{module.icon}</div>
              <h3 style={{ color: module.color, fontWeight: '700', marginBottom: '8px', fontSize: '1.2rem' }}>{module.name}</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>{module.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
