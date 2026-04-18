import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const DivisionStudents = () => {
  const { grade, division } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Generate 35-40 students per division
  const generateStudents = (grade, division) => {
    const maharashtrianNames = [
      'Rahul', 'Priya', 'Rohan', 'Ananya', 'Karan', 'Meera', 'Vikram', 'Sneha', 'Arjun', 'Pooja',
      'Sachin', 'Kavita', 'Aditya', 'Shreya', 'Vishal', 'Neha', 'Siddharth', 'Anjali', 'Ravi', 'Divya',
      'Amit', 'Sakshi', 'Nikhil', 'Ritika', 'Prateek', 'Swati', 'Yash', 'Komal', 'Dhruv', 'Pallavi',
      'Harsh', 'Simran', 'Kartik', 'Nandini', 'Rishi', 'Tanya', 'Varun', 'Alisha', 'Mohan', 'Geeta'
    ];
    const maharashtrianSurnames = [
      'Deshmukh', 'Bhosale', 'Pawar', 'Jadhav', 'More', 'Kulkarni', 'Joshi', 'Sharma', 'Patil', 'Desai',
      'Gaikwad', 'Chavan', 'Rane', 'Salunkhe', 'Mahajan', 'Nimbalkar', 'Gokhale', 'Apte', 'Tilak', 'Ranade'
    ];
    const nonMaharashtrianSurnames = ['Singh', 'Kumar', 'Gupta', 'Reddy', 'Sharma', 'Verma', 'Jain', 'Agarwal'];

    const students = [];
    const numStudents = Math.floor(Math.random() * 6) + 35; // 35-40

    for (let i = 1; i <= numStudents; i++) {
      const isMaharashtrian = Math.random() < 0.8; // 80% Maharashtrian
      const name = maharashtrianNames[Math.floor(Math.random() * maharashtrianNames.length)];
      const surname = isMaharashtrian
        ? maharashtrianSurnames[Math.floor(Math.random() * maharashtrianSurnames.length)]
        : nonMaharashtrianSurnames[Math.floor(Math.random() * nonMaharashtrianSurnames.length)];
      students.push({
        id: `${grade}-${division}-${i}`,
        name: `${name} ${surname}`,
        rollNo: i,
        grade: `${grade} ${division.charAt(0).toUpperCase() + division.slice(1)}`
      });
    }
    return students;
  };

  const students = useMemo(() => generateStudents(grade, division), [grade, division]);
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

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search student by name in this division"
          style={{ marginTop: '8px', width: '100%', maxWidth: '460px', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem' }}
        />
        <p style={{ color: '#64748b', marginTop: '8px', marginBottom: 0 }}>Showing {filteredStudents.length} of {students.length} students.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginTop: '20px' }}>
          {filteredStudents.map((student) => (
            <Link key={student.id} to={`/sis/student/${student.id}`} style={cardStyle}>
              <h4>{student.name}</h4>
              <p>Roll No: {student.rollNo}</p>
              <p>Grade: {student.grade}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default DivisionStudents;