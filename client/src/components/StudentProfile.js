import React from 'react';
import { useParams } from 'react-router-dom';

const StudentProfile = () => {
  const { id } = useParams();

  // Parse the ID to get grade, division, rollNo
  const [grade, division, rollNo] = id.split('-');

  // Generate detailed student profile based on ID
  const generateStudentProfile = (id) => {
    const maharashtrianNames = [
      'Rahul', 'Priya', 'Rohan', 'Ananya', 'Karan', 'Meera', 'Vikram', 'Sneha', 'Arjun', 'Pooja',
      'Sachin', 'Kavita', 'Aditya', 'Shreya', 'Vishal', 'Neha', 'Siddharth', 'Anjali', 'Ravi', 'Divya'
    ];
    const maharashtrianSurnames = [
      'Deshmukh', 'Bhosale', 'Pawar', 'Jadhav', 'More', 'Kulkarni', 'Joshi', 'Sharma', 'Patil', 'Desai'
    ];
    const nonMaharashtrianSurnames = ['Singh', 'Kumar', 'Gupta', 'Reddy'];

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const addresses = [
      '123 Main Street, Thane West, Maharashtra',
      '456 Park Road, Thane East, Maharashtra',
      '789 Garden Colony, Navi Mumbai, Maharashtra',
      '321 Hill View, Kalyan, Maharashtra',
      '654 River Side, Dombivli, Maharashtra'
    ];
    const parentNames = [
      'Rajesh Kumar', 'Sunita Sharma', 'Amit Patel', 'Meera Singh', 'Vikram Joshi', 'Priya Desai',
      'Rohan Gupta', 'Anjali Reddy', 'Sachin Bhosale', 'Kavita Pawar'
    ];
    const medicalConditions = ['None', 'Asthma', 'Allergy to dust', 'Mild dyslexia', 'None', 'None', 'None', 'None'];
    const hobbies = [
      'Cricket, Reading', 'Dancing, Painting', 'Football, Music', 'Swimming, Chess',
      'Basketball, Drawing', 'Tennis, Singing', 'Badminton, Writing', 'Volleyball, Cooking'
    ];

    // Use ID to seed random generation for consistency
    const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = (max) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * max);

    const isMaharashtrian = random(10) < 8; // 80% Maharashtrian
    const firstName = maharashtrianNames[random(maharashtrianNames.length)];
    const surname = isMaharashtrian
      ? maharashtrianSurnames[random(maharashtrianSurnames.length)]
      : nonMaharashtrianSurnames[random(nonMaharashtrianSurnames.length)];

    const birthYear = 2026 - parseInt(grade) - 5 + random(2); // Approximate age
    const birthMonth = random(12) + 1;
    const birthDay = random(28) + 1;

    return {
      name: `${firstName} ${surname}`,
      rollNo: rollNo,
      grade: `${grade} ${division.charAt(0).toUpperCase() + division.slice(1)}`,
      dateOfBirth: `${birthDay.toString().padStart(2, '0')}/${birthMonth.toString().padStart(2, '0')}/${birthYear}`,
      address: addresses[random(addresses.length)],
      parentName: parentNames[random(parentNames.length)],
      parentContact: `+91 ${9000000000 + random(100000000)}`,
      parentEmail: `${parentNames[random(parentNames.length)].toLowerCase().replace(' ', '.')}@gmail.com`,
      bloodGroup: bloodGroups[random(bloodGroups.length)],
      emergencyContact: `+91 ${8000000000 + random(100000000)}`,
      admissionDate: `15/06/${2020 + parseInt(grade)}`,
      medicalConditions: medicalConditions[random(medicalConditions.length)],
      hobbies: hobbies[random(hobbies.length)],
      achievements: random(5) > 2 ? 'School Science Fair Winner, Class Topper' : 'Active in Sports Club',
      photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}` // Placeholder avatar
    };
  };

  const student = generateStudentProfile(id);

  const profileStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  };

  const photoStyle = {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    marginBottom: '20px',
    border: '4px solid #e5e7eb',
  };

  const detailStyle = {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  };

  const fieldStyle = {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb',
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2>Student Profile</h2>
        <div style={profileStyle}>
          <img src={student.photo} alt={student.name} style={photoStyle} />
          <h3>{student.name}</h3>

          <div style={detailStyle}>
            <div style={fieldStyle}>
              <strong>Roll Number:</strong> {student.rollNo}
            </div>
            <div style={fieldStyle}>
              <strong>Grade:</strong> {student.grade}
            </div>
            <div style={fieldStyle}>
              <strong>Date of Birth:</strong> {student.dateOfBirth}
            </div>
            <div style={fieldStyle}>
              <strong>Blood Group:</strong> {student.bloodGroup}
            </div>
            <div style={fieldStyle}>
              <strong>Address:</strong> {student.address}
            </div>
            <div style={fieldStyle}>
              <strong>Parent Name:</strong> {student.parentName}
            </div>
            <div style={fieldStyle}>
              <strong>Parent Contact:</strong> {student.parentContact}
            </div>
            <div style={fieldStyle}>
              <strong>Parent Email:</strong> {student.parentEmail}
            </div>
            <div style={fieldStyle}>
              <strong>Emergency Contact:</strong> {student.emergencyContact}
            </div>
            <div style={fieldStyle}>
              <strong>Admission Date:</strong> {student.admissionDate}
            </div>
            <div style={fieldStyle}>
              <strong>Medical Conditions:</strong> {student.medicalConditions}
            </div>
            <div style={fieldStyle}>
              <strong>Hobbies:</strong> {student.hobbies}
            </div>
            <div style={fieldStyle}>
              <strong>Achievements:</strong> {student.achievements}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default StudentProfile;