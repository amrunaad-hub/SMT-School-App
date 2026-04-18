import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SearchBar from './SearchBar';
import { getStudentsByClass } from '../data/studentDirectory';

const DivisionStudents = () => {
  const { grade, division } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const students = useMemo(() => getStudentsByClass(grade, division), [grade, division]);
  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => student.name.toLowerCase().includes(query));
  }, [searchTerm, students]);

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
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>← Previous Menu</button>
          <Link to={`/sis/grade/${grade}`} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>↩ Back to Grade {grade}</Link>
        </div>
        <h2>Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)} Students</h2>
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
            <Link key={student.id} to={`/sis/student/${student.id}`} style={cardStyle}>
              <h4>{student.name}</h4>
              <p>Roll No: {student.rollNo}</p>
              <p>Grade: {student.gradeLabel}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default DivisionStudents;