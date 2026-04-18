import React, { useMemo, useState } from 'react';
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
  const [moduleQuery, setModuleQuery] = useState('');

  const filteredModules = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) => {
      return module.name.toLowerCase().includes(query) || module.description.toLowerCase().includes(query);
    });
  }, [moduleQuery]);

  return (
    <main style={{ padding: '28px', maxWidth: '1220px', margin: '0 auto', background: 'radial-gradient(circle at 15% 20%, #e0f2fe 0%, #f8fafc 40%, #eef2ff 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <div style={{ padding: '18px 20px', border: '2px solid #bfdbfe', borderRadius: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #f0fdf4 100%)', boxShadow: '0 10px 30px rgba(30, 64, 175, 0.12)' }}>
          <h2 style={{ fontSize: '2rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>📚 School ERP Dashboard</h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', marginBottom: '14px', fontWeight: '500' }}>
            Welcome to the professional School ERP system. Search and open any module instantly.
          </p>
          <input
            type="text"
            value={moduleQuery}
            onChange={(e) => setModuleQuery(e.target.value)}
            placeholder="Search module by name or purpose"
            style={{ width: '100%', maxWidth: '460px', padding: '11px 13px', borderRadius: '10px', border: '1px solid #93c5fd', fontSize: '0.95rem', outline: 'none', background: '#fff' }}
          />
          <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Showing {filteredModules.length} of {modules.length} modules</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {filteredModules.map((module) => (
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
