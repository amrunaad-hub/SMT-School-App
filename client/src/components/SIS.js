import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const grades = Array.from({ length: 10 }, (_, i) => i + 1);
const firstNames = ['Rahul', 'Priya', 'Rohan', 'Ananya', 'Karan', 'Meera', 'Vikram', 'Sneha', 'Arjun', 'Pooja', 'Sachin', 'Kavita', 'Aditya', 'Shreya', 'Vishal', 'Neha'];
const lastNames = ['Deshmukh', 'Bhosale', 'Pawar', 'Jadhav', 'More', 'Kulkarni', 'Joshi', 'Patil', 'Desai', 'Gaikwad', 'Chavan', 'Mahajan'];
const divisions = ['alpha', 'beta', 'gamma'];

const SIS = () => {
  const [studentQuery, setStudentQuery] = useState('');

  const studentDirectory = useMemo(() => {
    const directory = [];
    grades.forEach((grade) => {
      divisions.forEach((division) => {
        for (let roll = 1; roll <= 30; roll += 1) {
          const firstName = firstNames[(grade * 13 + roll) % firstNames.length];
          const lastName = lastNames[(grade * 7 + roll * 3) % lastNames.length];
          directory.push({
            id: `${grade}-${division}-${roll}`,
            name: `${firstName} ${lastName}`,
            grade,
            division,
            roll,
          });
        }
      });
    });
    return directory;
  }, []);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return [];
    return studentDirectory.filter((student) => student.name.toLowerCase().includes(query)).slice(0, 30);
  }, [studentQuery, studentDirectory]);

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
          <input
            type="text"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Search student by name (school-wide)"
            style={{ width: '100%', maxWidth: '500px', padding: '11px 13px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem' }}
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
                    <p style={{ margin: '6px 0 0', color: '#64748b' }}>Grade {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)} • Roll {student.roll}</p>
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