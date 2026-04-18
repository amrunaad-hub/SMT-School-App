import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { GRADES, searchStudentsByName } from '../data/studentDirectory';

const grades = GRADES;

const SIS = () => {
  const [studentQuery, setStudentQuery] = useState('');

  const filteredStudents = useMemo(() => {
    return searchStudentsByName(studentQuery, 30);
  }, [studentQuery]);

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

        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          <SearchBar
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Search student by name (school-wide)"
            maxWidth="500px"
          />
        </div>

        {studentQuery.trim() && (
          <div style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fbff' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e3a8a' }}>Student Search Results</h3>
            {filteredStudents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                {filteredStudents.map((student) => (
                  <Link key={student.id} to={`/sis/student/${student.id}`} style={{ textDecoration: 'none', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                    <strong>{student.name}</strong>
                    <p style={{ margin: '6px 0 0', color: '#64748b' }}>Grade {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)} • Roll {student.rollNo}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>No students found for this name query.</p>
            )}
          </div>
        )}

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