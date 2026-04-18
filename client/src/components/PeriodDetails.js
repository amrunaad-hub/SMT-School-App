import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getPeriodById } from '../data/facultyScheduler';

const PeriodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const period = getPeriodById(id);

  const objectives = {
    'English': 'Develop phonics, reading fluency, listening comprehension, and spoken confidence.',
    'Hindi': 'Build grammar foundation, vocabulary, and expressive language through stories and poems.',
    'Marathi': 'Strengthen regional language reading, pronunciation, and cultural-literary understanding.',
    'Maths': 'Develop number sense, operations fluency, and hands-on problem solving.',
    'EVS': 'Connect classroom learning with environment, community life, and practical observation.',
    'Library': 'Cultivate reading habit, silent reading discipline, and book care practices.',
    'Yoga': 'Improve posture, breathing, focus, and calm mind-body routines.',
    'Gym': 'Build stamina, flexibility, coordination, and teamwork via physical drills.',
    'Cyber / Computer': 'Introduce keyboard basics, safe digital behavior, and beginner computer skills.',
  };

  const materials = {
    'English': 'Readers, workbook, flash cards, notebook, pencil set',
    'Hindi': 'Hindi textbook, practice notebook, vocabulary cards',
    'Marathi': 'Marathi reader, writing notebook, story cards',
    'Maths': 'Math workbook, abacus kit, ruler, counters',
    'EVS': 'EVS textbook, picture charts, activity notebook',
    'Library': 'Curated story books, issue register, reading tracker',
    'Yoga': 'Yoga mats, posture chart, calm-breathing audio cues',
    'Gym': 'Cones, agility ladder, bean bags, fitness markers',
    'Cyber / Computer': 'Computer lab access, keyboard worksheet, projector support',
  };

  const periodAttendance = period && period.subject !== 'Break' && period.subject !== 'Assembly'
    ? `${32 + ((period.grade + period.id.length) % 8)} students present`
    : 'All students';

  if (!period) {
    return (
      <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <section>
          <h2>Period Details</h2>
          <p style={{ color: '#64748b' }}>Invalid period link. Please return to timetable.</p>
          <Link to="/timetable" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>← Back to Timetable</Link>
        </section>
      </main>
    );
  }

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
          <div style={fieldStyle}>
            <strong>Live Attendance Snapshot:</strong> {periodAttendance}
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Learning Objectives:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{objectives[period.subject] || (period.subject === 'Assembly' ? 'Morning prayer, announcements, and national anthem.' : 'Structured instructional learning outcomes.')}</p>
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Materials Required:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{materials[period.subject] || (period.subject === 'Break' ? 'N/A' : 'Standard classroom resources')}</p>
          </div>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <strong>Additional Notes:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{period.subject === 'Assembly' ? 'Compulsory attendance for all learners and staff.' : period.subject === 'Break' ? 'Student refreshment and supervised movement break.' : 'Teacher assignment synchronized with master faculty allocation across all divisions.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PeriodDetails;