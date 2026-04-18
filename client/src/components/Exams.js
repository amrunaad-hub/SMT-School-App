import React from 'react';
import { Link } from 'react-router-dom';

const Exams = () => {
  const exams = [
    { id: 1, subject: 'Mathematics', date: '2026-05-15', grade: '5 Alpha' },
    { id: 2, subject: 'Science', date: '2026-05-16', grade: '6 Beta' },
    { id: 3, subject: 'English', date: '2026-05-17', grade: '7 Gamma' },
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
        <h2>Exams</h2>
        <p style={{ color: '#4b5563' }}>
          Schedule and manage examinations and results.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {exams.map((exam) => (
            <Link key={exam.id} to={`/exams/${exam.id}`} style={cardStyle}>
              <h3>{exam.subject}</h3>
              <p>Date: {exam.date}</p>
              <p>Grade: {exam.grade}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Exams;