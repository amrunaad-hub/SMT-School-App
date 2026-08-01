import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SearchBar from './SearchBar';
import { api } from '../api';

const DivisionStudents = () => {
  const { grade, division } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/api/students', { grade, division, limit: 200 })
      .then((data) => {
        if (!cancelled) {
          setStudents(data.students || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load students.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [grade, division]);

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return `${student.firstName} ${student.lastName}`.toLowerCase().includes(query);
  });

  const cardStyle = {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '10px',
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
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Previous Menu</button>
          <Link to={`/sis/grade/${grade}`} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>Back to Grade {grade}</Link>
        </div>
        <h2>Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)} Students</h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : (
          <>
            <p style={{ color: '#4b5563' }}>
              {students.length} students in Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)}.
            </p>

            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student by name in this division"
              maxWidth="460px"
              containerStyle={{ marginTop: '8px' }}
            />
            <p style={{ color: '#64748b', marginTop: '8px', marginBottom: 0 }}>Showing {filteredStudents.length} of {students.length} students.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginTop: '20px' }}>
              {filteredStudents.map((student) => (
                <Link key={student._id} to={`/sis/student/${student._id}`} style={cardStyle}>
                  <h4>{student.firstName} {student.lastName}</h4>
                  <p>Roll No: {student.rollNo}</p>
                  <p>Grade: {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default DivisionStudents;
