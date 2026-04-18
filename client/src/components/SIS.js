import React from 'react';
import { Link } from 'react-router-dom';

const SIS = () => {
  const grades = Array.from({ length: 10 }, (_, i) => i + 1);

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
        <h2>Student Information System (SIS)</h2>
        <p style={{ color: '#4b5563' }}>
          Select a grade to view divisions and students.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {grades.map((grade) => (
            <Link key={grade} to={`/sis/grade/${grade}`} style={cardStyle}>
              <h3>Grade {grade}</h3>
              <p>3 Divisions: Alpha, Beta, Gamma</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default SIS;