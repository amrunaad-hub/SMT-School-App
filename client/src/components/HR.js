import React from 'react';
import { Link } from 'react-router-dom';

const HR = () => {
  const staff = [
    { id: 1, name: 'Mr. Rajesh Kumar', role: 'Mathematics Teacher', status: 'Present' },
    { id: 2, name: 'Ms. Priya Sharma', role: 'Science Teacher', status: 'Present' },
    { id: 3, name: 'Mrs. Sunita Patel', role: 'Principal', status: 'Present' },
    { id: 4, name: 'Mr. Amit Desai', role: 'Admin Officer', status: 'Present' },
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

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2>Human Resources (HR)</h2>
        <p style={{ color: '#4b5563' }}>
          Manage staff, payroll, and employee records.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {staff.map((person) => (
            <Link key={person.id} to={`/hr/${person.id}`} style={cardStyle}>
              <h3>{person.name}</h3>
              <p>Role: {person.role}</p>
              <p>Status: {person.status}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default HR;