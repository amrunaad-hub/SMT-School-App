import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const GradeDivisions = () => {
  const { grade } = useParams();
  const navigate = useNavigate();
  const divisions = ['Alpha', 'Beta', 'Gamma'];

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
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>← Previous Menu</button>
          <Link to="/sis" style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>↩ Back to SIS</Link>
        </div>
        <h2>Grade {grade} Divisions</h2>
        <p style={{ color: '#4b5563' }}>
          Select a division for Grade {grade}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {divisions.map((division) => (
            <Link key={division} to={`/sis/grade/${grade}/${division.toLowerCase()}`} style={cardStyle}>
              <h3>Division {division}</h3>
              <p>Grade {grade} {division}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default GradeDivisions;