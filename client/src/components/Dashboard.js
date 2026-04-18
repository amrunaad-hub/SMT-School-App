import React from 'react';
import { Link } from 'react-router-dom';

const modules = [
  { name: 'Command Center', path: '/command-center', description: 'Real-time school analytics' },
  { name: 'Student Information System', path: '/sis', description: 'Manage student profiles' },
  { name: 'Fee Management', path: '/finance', description: 'Track fee collection' },
  { name: 'Admissions', path: '/admissions', description: 'Manage enrollments' },
  { name: 'Timetable', path: '/timetable', description: 'Schedule classes' },
  { name: 'Human Resources', path: '/hr', description: 'Manage staff' },
  { name: 'Exams', path: '/exams', description: 'Schedule examinations' },
  { name: 'Attendance', path: '/attendance', description: 'Track attendance' },
  { name: 'Transport', path: '/transport', description: 'Manage transport' },
  { name: 'Inventory', path: '/inventory', description: 'Manage supplies' },
  { name: 'Communication', path: '/communication', description: 'Announcements and messages' },
];

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

const Dashboard = () => {
  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2>School ERP Dashboard</h2>
        <p style={{ color: '#4b5563' }}>
          Welcome to the School ERP system. Select a module to manage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {modules.map((module) => (
            <Link key={module.path} to={module.path} style={cardStyle}>
              <h3>{module.name}</h3>
              <p>{module.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
