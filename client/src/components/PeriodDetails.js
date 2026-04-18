import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

const PeriodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Parse the ID to get grade, division, and period index
  const [grade, division, periodIndex] = id.split('-').map((part, index) => index === 0 ? parseInt(part) : index === 2 ? parseInt(part) : part);

  // Generate period details based on ID
  const generatePeriodDetails = (grade, division, periodIndex) => {
    const subjects = [
      'English', 'Hindi', 'Mathematics', 'EVS', 'Art Education', 'Music', 'Physical Education',
      'Computer Science', 'Moral Science', 'General Knowledge'
    ];

    const teachers = [
      'Mrs. Sunita Patel', 'Mr. Rajesh Kumar', 'Ms. Priya Sharma', 'Mr. Amit Desai',
      'Mrs. Meera Singh', 'Mr. Vikram Joshi', 'Ms. Anjali Rao', 'Mr. Rohan Gupta'
    ];

    const rooms = ['101', '102', '103', '104', '105', '106', '107', '108', 'Auditorium', 'Playground'];

    const periods = [
      { time: '1:00 PM - 1:30 PM', type: 'Prayer & Assembly', subject: 'Assembly', teacher: 'All Staff', room: 'Auditorium' },
      { time: '1:30 PM - 2:00 PM', type: 'Period 1' },
      { time: '2:00 PM - 2:30 PM', type: 'Period 2' },
      { time: '2:30 PM - 3:00 PM', type: 'Period 3' },
      { time: '3:00 PM - 3:20 PM', type: 'Long Break', subject: 'Break', teacher: '-', room: '-' },
      { time: '3:20 PM - 3:50 PM', type: 'Period 4' },
      { time: '3:50 PM - 4:20 PM', type: 'Period 5' },
      { time: '4:20 PM - 4:30 PM', type: 'Short Break', subject: 'Break', teacher: '-', room: '-' },
      { time: '4:30 PM - 5:00 PM', type: 'Period 6' },
      { time: '5:00 PM - 5:30 PM', type: 'Period 7' },
      { time: '5:30 PM - 5:45 PM', type: 'Period 8' }
    ];

    const period = periods[periodIndex];

    if (period.type.includes('Break') || period.type === 'Prayer & Assembly') {
      return {
        ...period,
        grade,
        objectives: period.type === 'Prayer & Assembly' ? 'Morning prayer, national anthem, and school announcements' : 'Rest and refreshment break',
        materials: 'N/A',
        attendance: 'All students',
        notes: period.type === 'Prayer & Assembly' ? 'Compulsory attendance for all students and teachers' : 'Students can have snacks and relax'
      };
    }

    // Generate consistent data based on grade, division, and period
    const divisions = ['alpha', 'beta', 'gamma'];
    const divisionIndex = divisions.indexOf(division);
    const seed = grade * 1000 + divisionIndex * 100 + periodIndex;
    const subjectIndex = (seed * 7 + 13) % subjects.length;
    const teacherIndex = (seed * 11 + 17) % teachers.length;
    const roomIndex = (seed * 5 + 23) % rooms.length;

    const subject = subjects[subjectIndex];
    const teacher = teachers[teacherIndex];
    const room = rooms[roomIndex];

    // Generate additional details
    const objectives = {
      'English': 'Develop reading, writing, and communication skills',
      'Hindi': 'Enhance Hindi language proficiency and comprehension',
      'Mathematics': 'Build mathematical concepts and problem-solving skills',
      'EVS': 'Understand environmental and social concepts',
      'Art Education': 'Foster creativity and artistic expression',
      'Music': 'Develop musical appreciation and basic skills',
      'Physical Education': 'Promote physical fitness and sportsmanship',
      'Computer Science': 'Introduce basic computer concepts and skills',
      'Moral Science': 'Develop ethical values and moral reasoning',
      'General Knowledge': 'Expand knowledge about the world and current affairs'
    };

    const materials = {
      'English': 'Textbook, notebook, pencil, eraser',
      'Hindi': 'Hindi textbook, notebook, pencil',
      'Mathematics': 'Math textbook, notebook, ruler, compass',
      'EVS': 'EVS textbook, notebook, colored pencils',
      'Art Education': 'Drawing sheets, colors, brushes, clay',
      'Music': 'Musical instruments, song sheets',
      'Physical Education': 'Sports equipment, cones, whistle',
      'Computer Science': 'Computer lab access, mouse, keyboard',
      'Moral Science': 'Story books, discussion materials',
      'General Knowledge': 'GK books, maps, atlas'
    };

    return {
      ...period,
      grade,
      division: division.charAt(0).toUpperCase() + division.slice(1),
      subject,
      teacher,
      room,
      objectives: objectives[subject] || 'Subject-specific learning objectives',
      materials: materials[subject] || 'Standard classroom materials',
      attendance: `${35 + Math.floor(Math.random() * 6)} students present`,
      notes: 'Regular classroom session with interactive teaching methods'
    };
  };

  const period = generatePeriodDetails(grade, division, periodIndex);

  const detailStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '20px'
  };

  const fieldStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb'
  };

  const backButtonStyle = {
    padding: '12px 24px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '20px'
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <section>
        <button type="button" onClick={() => navigate(-1)} style={{ ...backButtonStyle, background: '#0f766e', marginRight: '10px' }}>← Previous Menu</button>
        <Link to="/timetable" style={backButtonStyle}>← Back to Timetable</Link>
        <h2>Period Details</h2>
        <h3>Grade {period.grade} {period.division} - {period.type}</h3>

        <div style={detailStyle}>
          <div style={fieldStyle}>
            <strong>Time:</strong> {period.time}
          </div>
          <div style={fieldStyle}>
            <strong>Subject:</strong> {period.subject}
          </div>
          <div style={fieldStyle}>
            <strong>Teacher:</strong> {period.teacher}
          </div>
          <div style={fieldStyle}>
            <strong>Room:</strong> {period.room}
          </div>
          <div style={fieldStyle}>
            <strong>Grade:</strong> {period.grade}
          </div>
          <div style={fieldStyle}>
            <strong>Attendance:</strong> {period.attendance}
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Learning Objectives:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{period.objectives}</p>
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Materials Required:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{period.materials}</p>
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Additional Notes:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{period.notes}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PeriodDetails;