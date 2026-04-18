import React from 'react';
import { Link, useParams } from 'react-router-dom';

const DivisionStudents = () => {
  const { grade, division } = useParams();

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

  const students = generateStudents(grade, division);

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
        <h2>Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)} Students</h2>
        <p style={{ color: '#4b5563' }}>
          {students.length} students in Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginTop: '20px' }}>
          {students.map((student) => (
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