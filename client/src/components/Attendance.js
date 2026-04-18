import React, { useMemo, useRef, useState } from 'react';

const Attendance = () => {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDate, setSelectedDate] = useState('2026-04-18');
  const detailsRef = useRef(null);

  const gradeStats = [
    {
      grade: 'Grade 1',
      present: 38,
      absent: 6,
      attendancePercent: 86,
      divisionCount: 3,
      divisions: [
        { division: 'A', present: 13, absent: 2, attendancePercent: 87 },
        { division: 'B', present: 12, absent: 3, attendancePercent: 80 },
        { division: 'C', present: 13, absent: 1, attendancePercent: 93 },
      ],
    },
    {
      grade: 'Grade 2',
      present: 30,
      absent: 8,
      attendancePercent: 79,
      divisionCount: 3,
      divisions: [
        { division: 'A', present: 10, absent: 3, attendancePercent: 77 },
        { division: 'B', present: 11, absent: 2, attendancePercent: 85 },
        { division: 'C', present: 9, absent: 3, attendancePercent: 75 },
      ],
    },
    {
      grade: 'Grade 3',
      present: 34,
      absent: 4,
      attendancePercent: 89,
      divisionCount: 2,
      divisions: [
        { division: 'A', present: 18, absent: 1, attendancePercent: 95 },
        { division: 'B', present: 16, absent: 3, attendancePercent: 84 },
      ],
    },
  ];

  const dailyAttendance = [
    {
      date: '2026-04-18',
      grade: 'Grade 1',
      division: 'A',
      present: 13,
      absent: 2,
      records: [
        { name: 'Aarav Patel', status: 'Present' },
        { name: 'Meera Singh', status: 'Absent (No intimation)' },
        { name: 'Riya Desai', status: 'Present' },
      ],
    },
    {
      date: '2026-04-18',
      grade: 'Grade 1',
      division: 'B',
      present: 12,
      absent: 3,
      records: [
        { name: 'Ankit Sharma', status: 'Present' },
        { name: 'Naina Kapoor', status: 'Absent (Advance leave)' },
        { name: 'Rohit Jain', status: 'Present' },
      ],
    },
    {
      date: '2026-04-18',
      grade: 'Grade 2',
      division: 'A',
      present: 10,
      absent: 3,
      records: [
        { name: 'Sara Mehta', status: 'Present' },
        { name: 'Vikram Roy', status: 'Absent (No intimation)' },
      ],
    },
    {
      date: '2026-04-18',
      grade: 'Grade 3',
      division: 'A',
      present: 18,
      absent: 1,
      records: [
        { name: 'Priya Nair', status: 'Present' },
        { name: 'Kabir Saini', status: 'Present' },
      ],
    },
  ];

  const leaveApplications = [
    { id: 1, student: 'Nisha Bhatia', grade: 'Grade 1', date: '2026-04-16', type: 'Medical leave', notice: '3 days in advance' },
    { id: 2, student: 'Karan Shetty', grade: 'Grade 2', date: '2026-04-18', type: 'Family event', notice: '2 days in advance' },
    { id: 3, student: 'Tara Bose', grade: 'Grade 3', date: '2026-04-18', type: 'Personal', notice: '1 day in advance' },
  ];

  const noIntimationAbsentees = [
    { id: 1, student: 'Rohan Desai', grade: 'Grade 1', division: 'A', date: '2026-04-18', note: 'Absent without prior intimation' },
    { id: 2, student: 'Maya Kapoor', grade: 'Grade 2', division: 'B', date: '2026-04-18', note: 'Absent without prior intimation' },
  ];

  const lateArrivals = [
    { id: 1, student: 'Aditi Jalan', grade: 'Grade 1', division: 'C', minutesLate: 15 },
    { id: 2, student: 'Neil Shah', grade: 'Grade 3', division: 'B', minutesLate: 20 },
  ];

  const weeklyTrend = [
    { day: 'Mon', present: 105, absent: 10 },
    { day: 'Tue', present: 102, absent: 13 },
    { day: 'Wed', present: 108, absent: 7 },
    { day: 'Thu', present: 103, absent: 12 },
    { day: 'Fri', present: 107, absent: 8 },
  ];

  const handleGradeClick = (grade) => {
    setSelectedGrade(grade);
    setSelectedDivision(null);
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDivisionClick = (division) => {
    setSelectedDivision(division);
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredDivisions = useMemo(() => {
    if (!selectedGrade) return [];
    return gradeStats.find((item) => item.grade === selectedGrade)?.divisions || [];
  }, [selectedGrade]);

  const filteredDailyRecords = useMemo(() => {
    return dailyAttendance.filter((record) => {
      const gradeMatch = selectedGrade ? record.grade === selectedGrade : true;
      const divisionMatch = selectedDivision ? record.division === selectedDivision : true;
      const dateMatch = selectedDate ? record.date === selectedDate : true;
      return gradeMatch && divisionMatch && dateMatch;
    });
  }, [selectedGrade, selectedDivision, selectedDate]);

  const selectedGradeText = selectedGrade ? ` for ${selectedGrade}` : '';
  const selectedDivisionText = selectedDivision ? ` / ${selectedDivision}` : '';

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
  };

  const cardStyle = {
    padding: '20px',
    borderRadius: '16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  return (
    <main style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Attendance Dashboards</h2>
        <p style={{ color: '#475569', marginTop: '8px' }}>
          Multi-level attendance analytics with grade, division, daily drill-down, leave planning and absentee alerts.
        </p>
      </section>

      <section style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '10px' }}>Today&apos;s Attendance</h3>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>97%</p>
          <p style={{ marginTop: '8px', color: '#64748b' }}>Overall student attendance on {selectedDate}.</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '10px' }}>Leaves Applied in Advance</h3>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>3</p>
          <p style={{ marginTop: '8px', color: '#64748b' }}>Students who submitted leave requests before the day.</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '10px' }}>Absent Without Intimation</h3>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>2</p>
          <p style={{ marginTop: '8px', color: '#64748b' }}>Unplanned absences requiring follow-up.</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '10px' }}>Late Arrivals</h3>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>2</p>
          <p style={{ marginTop: '8px', color: '#64748b' }}>Students who reached after the bell.</p>
        </div>
      </section>

      <section style={{ marginTop: '28px', padding: '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ marginBottom: '18px' }}>Grade-wise Attendance Snapshot</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {gradeStats.map((grade) => (
            <div
              key={grade.grade}
              onClick={() => handleGradeClick(grade.grade)}
              style={{
                ...cardStyle,
                cursor: 'pointer',
                background: selectedGrade === grade.grade ? '#def7ec' : cardStyle.background,
                borderColor: selectedGrade === grade.grade ? '#10b981' : cardStyle.border,
              }}
            >
              <h4 style={{ margin: '0 0 10px' }}>{grade.grade}</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Present</span>
                  <strong>{grade.present}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Absent</span>
                  <strong>{grade.absent}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Attendance</span>
                  <strong>{grade.attendancePercent}%</strong>
                </div>
                <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${grade.attendancePercent}%`, height: '100%', background: '#0ea5e9' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedGrade && (
        <section style={{ marginTop: '28px', padding: '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>Division Drilldown for {selectedGrade}</h3>
            <button type="button" style={buttonStyle} onClick={() => { setSelectedGrade(null); setSelectedDivision(null); }}>
              Clear Grade Filter
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginTop: '20px' }}>
            {filteredDivisions.map((division) => (
              <div
                key={division.division}
                onClick={() => handleDivisionClick(division.division)}
                style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  background: selectedDivision === division.division ? '#f0f9ff' : cardStyle.background,
                  borderColor: selectedDivision === division.division ? '#38bdf8' : cardStyle.border,
                }}
              >
                <h4 style={{ margin: '0 0 10px' }}>Division {division.division}</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Present</span>
                    <strong>{division.present}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Absent</span>
                    <strong>{division.absent}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Attendance</span>
                    <strong>{division.attendancePercent}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '28px', padding: '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }} ref={detailsRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Daily Attendance Details{selectedGradeText}{selectedDivisionText}</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Date filter and detailed attendance records by grade and division.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" style={buttonStyle} onClick={() => setSelectedDate('2026-04-18')}>
              18 Apr
            </button>
            <button type="button" style={buttonStyle} onClick={() => setSelectedDate('2026-04-17')}>
              17 Apr
            </button>
          </div>
        </div>
        <div style={{ marginTop: '22px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Grade</th>
                <th style={{ padding: '12px 16px' }}>Division</th>
                <th style={{ padding: '12px 16px' }}>Present</th>
                <th style={{ padding: '12px 16px' }}>Absent</th>
                <th style={{ padding: '12px 16px' }}>Records</th>
              </tr>
            </thead>
            <tbody>
              {filteredDailyRecords.length > 0 ? (
                filteredDailyRecords.map((record, index) => (
                  <tr key={`${record.grade}-${record.division}-${index}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 16px' }}>{record.date}</td>
                    <td style={{ padding: '14px 16px' }}>{record.grade}</td>
                    <td style={{ padding: '14px 16px' }}>{record.division}</td>
                    <td style={{ padding: '14px 16px' }}>{record.present}</td>
                    <td style={{ padding: '14px 16px' }}>{record.absent}</td>
                    <td style={{ padding: '14px 16px' }}>{record.records.map((r) => `${r.name} (${r.status})`).join(', ')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '18px 16px', color: '#64748b', textAlign: 'center' }}>
                    No attendance records available for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: '28px', padding: '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ marginBottom: '18px' }}>Leave & Absence Analytics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          <div style={cardStyle}>
            <h4 style={{ marginBottom: '12px' }}>Advance Leave Applications</h4>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{leaveApplications.length}</p>
            <p style={{ marginTop: '8px', color: '#64748b' }}>Students who applied before absence.</p>
          </div>
          <div style={cardStyle}>
            <h4 style={{ marginBottom: '12px' }}>Absent Without Intimation</h4>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{noIntimationAbsentees.length}</p>
            <p style={{ marginTop: '8px', color: '#64748b' }}>Require principal follow-up and parent contact.</p>
          </div>
          <div style={cardStyle}>
            <h4 style={{ marginBottom: '12px' }}>Late Arrivals</h4>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{lateArrivals.length}</p>
            <p style={{ marginTop: '8px', color: '#64748b' }}>Monitored for punctuality interventions.</p>
          </div>
        </div>

        <div style={{ marginTop: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Grade</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Notice</th>
              </tr>
            </thead>
            <tbody>
              {leaveApplications.map((leave) => (
                <tr key={leave.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px' }}>{leave.student}</td>
                  <td style={{ padding: '14px 16px' }}>{leave.grade}</td>
                  <td style={{ padding: '14px 16px' }}>{leave.type}</td>
                  <td style={{ padding: '14px 16px' }}>{leave.date}</td>
                  <td style={{ padding: '14px 16px' }}>{leave.notice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: '28px', padding: '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ marginBottom: '18px' }}>Weekly Attendance Trend</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '18px' }}>
          {weeklyTrend.map((point) => (
            <div key={point.day} style={cardStyle}>
              <h4 style={{ margin: '0 0 10px' }}>{point.day}</h4>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{point.present}</p>
              <p style={{ margin: '4px 0 0', color: '#64748b' }}>Present</p>
              <p style={{ margin: '10px 0 0', color: '#334155' }}><strong>{point.absent}</strong> absent</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Attendance;
