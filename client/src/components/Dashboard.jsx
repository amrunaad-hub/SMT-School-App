import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';

const workingModules = [
  { name: 'Student Information', path: '/sis', description: 'Manage student profiles', icon: '👥', color: '#2563eb' },
  { name: 'Attendance', path: '/attendance', description: 'Track attendance', icon: '✅', color: '#10b981' },
  { name: 'Timetable', path: '/timetable', description: 'Schedule classes', icon: '⏰', color: '#7c3aed' },
  { name: 'Communication', path: '/communication', description: 'Announcements and messages', icon: '💬', color: '#ec4899' },
  { name: 'Edit Requests', path: '/edit-requests', description: 'Review teacher-submitted edits', icon: '✏️', color: '#0891b2' },
];

const upcomingModules = [
  { name: 'Command Center', path: '/command-center', description: 'Real-time school analytics', icon: '🎛️' },
  { name: 'Fee Management', path: '/finance', description: 'Track fee collection', icon: '💰' },
  { name: 'Admissions', path: '/admissions', description: 'Manage enrollments', icon: '📝' },
  { name: 'Human Resources', path: '/hr', description: 'Manage staff', icon: '👔' },
  { name: 'Exams', path: '/exams', description: 'Schedule examinations', icon: '📊' },
  { name: 'Transport', path: '/transport', description: 'Manage transport', icon: '🚌' },
  { name: 'Inventory', path: '/inventory', description: 'Manage supplies', icon: '📦' },
];

const modules = [...workingModules, ...upcomingModules];

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

const upcomingCardStyle = {
  padding: '20px',
  border: '2px dashed #cbd5e1',
  borderRadius: '16px',
  background: '#f8fafc',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  opacity: 0.85,
};

const Dashboard = () => {
  const [moduleQuery, setModuleQuery] = useState('');

  const matches = (module, query) => module.name.toLowerCase().includes(query) || module.description.toLowerCase().includes(query);

  const filteredWorking = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    if (!query) return workingModules;
    return workingModules.filter((m) => matches(m, query));
  }, [moduleQuery]);

  const filteredUpcoming = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    if (!query) return upcomingModules;
    return upcomingModules.filter((m) => matches(m, query));
  }, [moduleQuery]);

  const filteredModules = [...filteredWorking, ...filteredUpcoming];

  return (
    <main style={{ padding: '28px', maxWidth: '1220px', margin: '0 auto', background: 'radial-gradient(circle at 15% 20%, #e0f2fe 0%, #f8fafc 40%, #eef2ff 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <div style={{ padding: '18px 20px', border: '2px solid #bfdbfe', borderRadius: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #f0fdf4 100%)', boxShadow: '0 10px 30px rgba(30, 64, 175, 0.12)' }}>
          <h2 style={{ fontSize: '2rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>📚 School ERP Dashboard</h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', marginBottom: '14px', fontWeight: '500' }}>
            Welcome to the professional School ERP system. Search and open any module instantly.
          </p>
          <SearchBar
            value={moduleQuery}
            onChange={(e) => setModuleQuery(e.target.value)}
            placeholder="Search module by name or purpose"
            maxWidth="460px"
            inputStyle={{ border: '1px solid #93c5fd', padding: '11px 38px 11px 34px' }}
          />
          <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Showing {filteredModules.length} of {modules.length} modules</p>
        </div>

        {filteredWorking.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {filteredWorking.map((module) => (
              <Link key={module.path} to={module.path} style={{...cardStyle(module.color), display: 'block'}}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{module.icon}</div>
                <h3 style={{ color: module.color, fontWeight: '700', marginBottom: '8px', fontSize: '1.2rem' }}>{module.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>{module.description}</p>
              </Link>
            ))}
          </div>
        )}

        {filteredUpcoming.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ color: '#475569', fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>🚧 Upcoming Features</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '14px' }}>Not yet finished — disabled for now.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {filteredUpcoming.map((module) => (
                <div key={module.path} style={{ ...upcomingCardStyle, cursor: 'not-allowed' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{module.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#334155', fontSize: '1rem' }}>{module.name}</strong>
                        <span style={{ padding: '1px 8px', borderRadius: '999px', background: '#e2e8f0', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>SOON</span>
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>{module.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;
