import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Timetable = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  // Generate consolidated timetable data
  const generateConsolidatedTimetable = () => {
    const subjects = [
      'English', 'Hindi', 'Mathematics', 'EVS', 'Art Education', 'Music', 'Physical Education',
      'Computer Science', 'Moral Science', 'General Knowledge'
    ];

    const teachers = [
      'Mrs. Sunita Patel', 'Mr. Rajesh Kumar', 'Ms. Priya Sharma', 'Mr. Amit Desai',
      'Mrs. Meera Singh', 'Mr. Vikram Joshi', 'Ms. Anjali Rao', 'Mr. Rohan Gupta'
    ];

    const rooms = ['101', '102', '103', '104', '105', '106', '107', '108', 'Auditorium', 'Playground'];

    const timeSlots = [
      '1:00-1:30', '1:30-2:00', '2:00-2:30', '2:30-3:00', '3:00-3:20', '3:20-3:50',
      '3:50-4:20', '4:20-4:30', '4:30-5:00', '5:00-5:30', '5:30-5:45'
    ];

    const periodTypes = [
      'Prayer & Assembly', 'Period 1', 'Period 2', 'Period 3', 'Long Break', 'Period 4',
      'Period 5', 'Short Break', 'Period 6', 'Period 7', 'Period 8'
    ];

    const grades = [1, 2, 3, 4];
    const divisions = ['Alpha', 'Beta', 'Gamma'];

    const shuffleArray = (array, seed) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        const j = seed % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const timetable = {};

    grades.forEach(grade => {
      divisions.forEach(division => {
        const classKey = `Grade ${grade} ${division}`;
        const classSeed = grade * 100 + divisions.indexOf(division) * 13;
        const shuffledSubjects = shuffleArray(subjects, classSeed);
        let lessonCount = 0;

        timetable[classKey] = timeSlots.map((timeSlot, index) => {
          const periodType = periodTypes[index];

          if (periodType.includes('Break') || periodType === 'Prayer & Assembly') {
            return {
              time: timeSlot,
              type: periodType,
              subject: periodType === 'Prayer & Assembly' ? 'Assembly' : 'Break',
              teacher: periodType === 'Prayer & Assembly' ? 'All Staff' : '-',
              room: periodType === 'Prayer & Assembly' ? 'Auditorium' : '-',
              id: `${grade}-${division.toLowerCase()}-${index}`
            };
          }

          const seed = grade * 1000 + divisions.indexOf(division) * 100 + index;
          const teacherIndex = (seed * 11 + 17) % teachers.length;
          const roomIndex = (seed * 5 + 23) % rooms.length;
          const subject = shuffledSubjects[lessonCount % shuffledSubjects.length];
          lessonCount += 1;

          return {
            time: timeSlot,
            type: periodType,
            subject,
            teacher: teachers[teacherIndex],
            room: rooms[roomIndex],
            id: `${grade}-${division.toLowerCase()}-${index}`
          };
        });
      });
    });

    return { timetable, timeSlots };
  };

  const { timetable, timeSlots } = generateConsolidatedTimetable();

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
    fontSize: '0.85rem',
    tableLayout: 'fixed'
  };

  const thStyle = {
    background: '#f8fafc',
    padding: '8px 4px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.75rem'
  };

  const tdStyle = {
    padding: '6px 4px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '0.75rem',
    height: '60px',
    verticalAlign: 'top'
  };

  const breakStyle = {
    background: '#fef3c7'
  };

  const assemblyStyle = {
    background: '#dbeafe'
  };

  const periodStyle = {
    background: '#f0f9ff'
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  };

  const classRowStyle = {
    background: '#f1f5f9',
    fontWeight: '600'
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', overflowX: 'auto' }}>
      <section>
        <h2>School Timetable</h2>
        <p style={{ color: '#4b5563', marginBottom: '20px' }}>
          Consolidated daily timetable for Grades 1-4. Click on any period for details.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '120px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10 }}>Class</th>
                {timeSlots.map(timeSlot => (
                  <th key={timeSlot} style={thStyle}>{timeSlot}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(timetable).map(([className, periods]) => (
                <tr key={className}>
                  <td style={{ ...tdStyle, ...classRowStyle, position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 5 }}>
                    {className}
                  </td>
                  {periods.map((period) => {
                    let cellStyle = periodStyle;
                    if (period.type.includes('Break')) cellStyle = breakStyle;
                    if (period.type === 'Prayer & Assembly') cellStyle = assemblyStyle;

                    return (
                      <td key={period.id} style={{ ...tdStyle, ...cellStyle }}>
                        <Link
                          to={`/timetable/period/${period.id}`}
                          style={{ color: 'inherit', textDecoration: 'none', display: 'block', height: '100%' }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>{period.subject}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{period.teacher}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{period.room}</div>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={navStyle}>
          <button style={buttonStyle} onClick={() => navigateDate(-1)}>
            ? Previous Day
          </button>
          <h3 style={{ margin: 0 }}>{formatDate(currentDate)}</h3>
          <button style={buttonStyle} onClick={() => navigateDate(1)}>
            Next Day ?
          </button>
        </div>
      </section>
    </main>
  );
};

export default Timetable;
