import React, { useEffect, useState, useMemo } from 'react';

const Parents = () => {
  const [activeModule, setActiveModule] = useState('profile');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Dummy data for Thane, Maharashtra CBSE school
  const studentProfile = {
    name: 'Aarav Sharma',
    grade: 'Grade 7',
    division: 'Alpha',
    rollNo: '7A-15',
    dob: '2015-03-15',
    address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@email.com',
    bloodGroup: 'O+',
    emergencyContact: 'Mrs. Priya Sharma (Mother) - +91 98765 43211',
    photo: 'https://via.placeholder.com/150', // Placeholder image
    admissionDate: '2020-06-01',
    fatherName: 'Mr. Rajesh Sharma',
    motherName: 'Mrs. Priya Sharma',
    siblings: ['Sister: Ananya Sharma (Grade 5)'],
  };

  const parentProfile = {
    name: 'Mr. Rajesh Sharma',
    relation: 'Father',
    phone: '+91 98765 43211',
    email: 'rajesh.sharma@email.com',
    occupation: 'Software Engineer',
    company: 'Tech Solutions Pvt Ltd, Thane',
    address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
    photo: 'https://via.placeholder.com/150',
  };

  // Extended attendance data
  const fullAttendanceData = [
    { date: '2026-04-01', status: 'present', type: 'regular' },
    { date: '2026-04-02', status: 'present', type: 'regular' },
    { date: '2026-04-03', status: 'absent', type: 'advance', reason: 'Medical leave' },
    { date: '2026-04-04', status: 'present', type: 'regular' },
    { date: '2026-04-05', status: 'holiday', type: 'public', reason: 'Maharashtra Day' },
    { date: '2026-04-06', status: 'absent', type: 'impromptu', reason: 'Fever' },
    { date: '2026-04-07', status: 'present', type: 'regular' },
    { date: '2026-04-08', status: 'present', type: 'regular' },
    { date: '2026-04-09', status: 'absent', type: 'advance', reason: 'Family function' },
    { date: '2026-04-10', status: 'holiday', type: 'public', reason: 'Good Friday' },
    { date: '2026-04-11', status: 'present', type: 'regular' },
    { date: '2026-04-12', status: 'present', type: 'regular' },
    { date: '2026-04-13', status: 'present', type: 'regular' },
    { date: '2026-04-14', status: 'present', type: 'regular' },
    { date: '2026-04-15', status: 'absent', type: 'advance', reason: 'Doctor appointment' },
  ];

  // Get last 10 days of attendance
  const last10DaysAttendance = useMemo(() => {
    return fullAttendanceData.slice(-10);
  }, []);

  const timetable = [
    { day: 'Monday', periods: [
      { time: '8:00-9:00', subject: 'English', teacher: 'Ms. Patel', details: 'Grammar and comprehension' },
      { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Mr. Kumar', details: 'Algebra equations' },
      { time: '10:00-11:00', subject: 'Science', teacher: 'Ms. Singh', details: 'Physics - Motion' },
      { time: '11:00-12:00', subject: 'Social Studies', teacher: 'Mr. Rao', details: 'Indian History' },
      { time: '12:00-1:00', subject: 'Hindi', teacher: 'Ms. Gupta', details: 'Literature' },
    ]},
    { day: 'Tuesday', periods: [
      { time: '8:00-9:00', subject: 'Mathematics', teacher: 'Mr. Kumar', details: 'Geometry' },
      { time: '9:00-10:00', subject: 'Science', teacher: 'Ms. Singh', details: 'Chemistry - Acids' },
      { time: '10:00-11:00', subject: 'English', teacher: 'Ms. Patel', details: 'Writing skills' },
      { time: '11:00-12:00', subject: 'Hindi', teacher: 'Ms. Gupta', details: 'Poetry' },
      { time: '12:00-1:00', subject: 'Social Studies', teacher: 'Mr. Rao', details: 'Geography' },
    ]},
  ];

  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-03-15', type: 'past', photos: ['sports1.jpg', 'sports2.jpg'], takeaways: 'Great participation, Aarav won 100m race silver medal', details: 'Held at school ground, 200 students participated' },
    { id: 2, title: 'PTM Meeting', date: '2026-04-20', type: 'upcoming', preparation: 'Prepare progress report discussion, bring any concerns', details: 'Meeting with class teacher and subject teachers' },
    { id: 3, title: 'Science Exhibition', date: '2026-05-10', type: 'upcoming', preparation: 'Help child prepare project on renewable energy', details: 'Inter-school competition, theme: Future of Energy' },
  ];

  const dailyActivities = [
    { date: '2026-04-14', classwork: 'Algebra equations practice', homework: 'Solve 20 problems from textbook pg 45', topics: ['Linear equations', 'Word problems'], projects: 'Math project on real-life applications due next week', attachments: ['worksheet.pdf'] },
    { date: '2026-04-15', classwork: 'English comprehension', homework: 'Write essay on My Hobby', topics: ['Grammar', 'Creative writing'], projects: 'Science model preparation', attachments: ['essay_guidelines.pdf'] },
  ];

  const photoGallery = [
    { event: 'Sports Day 2026', photos: ['sports1.jpg', 'sports2.jpg', 'sports3.jpg'] },
    { event: 'PTM March 2026', photos: ['ptm1.jpg', 'ptm2.jpg'] },
    { event: 'Annual Day 2025', photos: ['annual1.jpg', 'annual2.jpg', 'annual3.jpg'] },
  ];

  const feeDetails = {
    totalFee: 90000,
    instalments: [
      { dueDate: '2026-04-01', amount: 30000, status: 'paid' },
      { dueDate: '2026-07-01', amount: 30000, status: 'pending' },
      { dueDate: '2026-11-01', amount: 30000, status: 'pending' },
    ],
    paid: 30000,
    balance: 60000,
  };

  const reportCard = {
    exams: [
      { name: 'Pre Term 1', subjects: { English: 85, Math: 92, Science: 88, Social: 90, Hindi: 87 } },
      { name: 'Term 1', subjects: { English: 88, Math: 95, Science: 90, Social: 92, Hindi: 89 } },
      { name: 'Pre Term 2', subjects: { English: 90, Math: 88, Science: 92, Social: 85, Hindi: 91 } },
      { name: 'Term 2', subjects: { English: 92, Math: 96, Science: 94, Social: 88, Hindi: 93 } },
    ],
    assessments: { projects: 85, sports: 90, cleanliness: 95, behaviour: 92, notebooks: 88, projectCompletion: 87 },
  };

  const contacts = [
    { role: 'Class Representative (CR)', name: 'Riya Patel', email: 'riya.patel@smtthane.edu' },
    { role: 'PTA Member', name: 'Mr. Sharma', email: 'pta@smtthane.edu' },
    { role: 'School Admin', name: 'Ms. Desai', email: 'admin@smtthane.edu' },
    { role: 'Vice Principal', name: 'Mr. Kumar', email: 'vp@smtthane.edu' },
    { role: 'Principal', name: 'Dr. Singh', email: 'principal@smtthane.edu' },
  ];

  const getStatusColor = (status, type) => {
    if (status === 'present') return '#10b981';
    if (status === 'absent' && type === 'advance') return '#f59e0b';
    if (status === 'absent' && type === 'impromptu') return '#ef4444';
    if (status === 'holiday') return '#6b7280';
    return '#fff';
  };

  // Calendar generation function
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const getAttendanceForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return fullAttendanceData.find(a => a.date === dateStr);
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'profile':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)', border: '2px solid #0ea5e9', boxShadow: '0 4px 16px rgba(6, 182, 212, 0.1)' }}>
            <h3 style={{ color: '#0369a1', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>👤 Student Profile</h3>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '20px' }}>
              <img src={studentProfile.photo} alt="Student" onClick={() => setSelectedStudent(studentProfile)} style={{ cursor: 'pointer', borderRadius: '12px', width: '120px', height: '120px', border: '4px solid #0ea5e9', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }} />
              <div>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}><strong>👨 Name:</strong> {studentProfile.name}</p>
                <p style={{ fontSize: '1rem', marginBottom: '8px' }}><strong>📚 Grade:</strong> {studentProfile.grade} {studentProfile.division}</p>
                <p style={{ fontSize: '1rem', marginBottom: '8px' }}><strong>🎫 Roll No:</strong> {studentProfile.rollNo}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <h4 style={{ color: '#0369a1', fontWeight: '600' }}>📋 Detailed Profile</h4>
                <p><strong>🎂 DOB:</strong> {selectedStudent.dob}</p>
                <p><strong>📍 Address:</strong> {selectedStudent.address}</p>
                <p><strong>☎️ Phone:</strong> {selectedStudent.phone}</p>
                <p><strong>📧 Email:</strong> {selectedStudent.email}</p>
                <p><strong>🩸 Blood Group:</strong> {selectedStudent.bloodGroup}</p>
                <p><strong>🚨 Emergency Contact:</strong> {selectedStudent.emergencyContact}</p>
              </div>
            )}
          </div>
        );
      case 'parent-profile':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)', border: '2px solid #6b7280' }}>
            <h3 style={{ color: '#374151', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>👨‍💼 Parent Profile</h3>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '20px' }}>
              <img src={parentProfile.photo} alt="Parent" onClick={() => setSelectedStudent(parentProfile)} style={{ cursor: 'pointer', borderRadius: '12px', width: '120px', height: '120px', border: '4px solid #6b7280', boxShadow: '0 4px 12px rgba(107, 114, 128, 0.2)' }} />
              <div>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}><strong>👨 Name:</strong> {parentProfile.name}</p>
                <p style={{ fontSize: '1rem', marginBottom: '8px' }}><strong>🔗 Relation:</strong> {parentProfile.relation}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ color: '#374151', fontWeight: '600' }}>📋 Detailed Profile</h4>
                <p><strong>☎️ Phone:</strong> {selectedStudent.phone}</p>
                <p><strong>📧 Email:</strong> {selectedStudent.email}</p>
                <p><strong>💼 Occupation:</strong> {selectedStudent.occupation}</p>
                <p><strong>🏢 Company:</strong> {selectedStudent.company}</p>
              </div>
            )}
          </div>
        );
      case 'attendance':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)', border: '2px solid #22c55e', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)' }}>
            <h3 style={{ color: '#166534', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>📅 Attendance Calendar & History</h3>
            
            {/* Calendar */}
            <div style={{ marginBottom: '32px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ padding: '8px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>← Prev</button>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#166534', fontWeight: '700' }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ padding: '8px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Next →</button>
              </div>
              
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontWeight: '700', color: '#166534', padding: '8px', fontSize: '0.9rem' }}>{day}</div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((date, index) => {
                  const attendance = date ? getAttendanceForDate(date) : null;
                  const bgColor = !date ? '#f3f4f6' : attendance ? getStatusColor(attendance.status, attendance.type) : '#fafafa';
                  const isCurrentDate = date && new Date().toDateString() === date.toDateString();
                  
                  return (
                    <div key={index} style={{
                      backgroundColor: bgColor,
                      padding: '10px',
                      border: isCurrentDate ? '3px solid #22c55e' : '1px solid #dcfce7',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: date ? '#1f2937' : '#d1d5db',
                      minHeight: '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: date ? '600' : '400',
                      cursor: date && attendance ? 'help' : 'default',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }} title={attendance ? `${attendance.status.toUpperCase()} - ${attendance.reason || attendance.type}` : ''}>
                      {date ? date.getDate() : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '24px' }}>
              <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '12px' }}>Legend:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px' }}>
                <p style={{ margin: '4px 0' }}><span style={{ backgroundColor: '#10b981', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>✓ Present</span></p>
                <p style={{ margin: '4px 0' }}><span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>⚠ Absent (Advance)</span></p>
                <p style={{ margin: '4px 0' }}><span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>✕ Absent (Impromptu)</span></p>
                <p style={{ margin: '4px 0' }}><span style={{ backgroundColor: '#6b7280', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>● Holiday</span></p>
              </div>
            </div>

            {/* Last 10 Days History */}
            <div>
              <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '12px', fontSize: '1.1rem' }}>📊 Last 10 Days Attendance History</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {last10DaysAttendance.map((day) => {
                  const statusBg = getStatusColor(day.status, day.type);
                  const statusText = day.status === 'holiday' ? '🗓️ Holiday' : day.status === 'present' ? '✓ Present' : '✗ Absent';
                  
                  return (
                    <div key={day.date} style={{
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: `2px solid ${statusBg}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: `0 2px 8px ${statusBg}25`
                    }}>
                      <div>
                        <strong style={{ color: '#166534' }}>{new Date(day.date).toLocaleDateString()}</strong>
                        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.9rem' }}>{day.reason || day.type}</p>
                      </div>
                      <span style={{ background: statusBg, color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem' }}>{statusText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 'timetable':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #fbbf24', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ color: '#92400e', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>⏰ Weekly Timetable - Grade 7 Alpha</h3>
            {timetable.map(day => (
              <div key={day.day} style={{ marginBottom: '20px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                <h4 style={{ color: '#92400e', fontWeight: '700', marginBottom: '12px' }}>{day.day}</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {day.periods.map(period => (
                    <div key={period.time} onClick={() => alert(`Subject: ${period.subject}\nTeacher: ${period.teacher}\nDetails: ${period.details}`)} style={{ padding: '12px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', borderRadius: '8px', cursor: 'pointer', border: '2px solid #fcd34d', transition: 'all 0.2s' }}>
                      <strong style={{ color: '#92400e' }}>{period.time}:</strong> {period.subject} - {period.teacher}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 'events':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fce7f3 0%, #fce7f3 100%)', border: '2px solid #ec4899', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.1)' }}>
            <h3 style={{ color: '#9d174d', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>🎉 Event Calendar</h3>
            {events.map(event => (
              <div key={event.id} style={{ marginBottom: '20px', padding: '16px', background: '#fff', borderRadius: '12px', border: '2px solid #fbcfe8', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.1)' }}>
                <h4 style={{ color: '#9d174d', fontWeight: '700', marginBottom: '8px' }}>{event.title} - {event.date}</h4>
                <p><strong>📍 Type:</strong> {event.type === 'past' ? 'Past Event' : 'Upcoming Event'}</p>
                {event.type === 'past' ? (
                  <div>
                    <p><strong>📸 Takeaways:</strong> {event.takeaways}</p>
                    <p><strong>ℹ️ Details:</strong> {event.details}</p>
                  </div>
                ) : (
                  <div>
                    <p><strong>📝 Preparation:</strong> {event.preparation}</p>
                    <p><strong>ℹ️ Details:</strong> {event.details}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case 'activities':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)', border: '2px solid #6366f1', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)' }}>
            <h3 style={{ color: '#3730a3', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>📚 Daily Activities</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>← Previous Week</button>
              <span style={{ fontWeight: '700', color: '#3730a3' }}>Week of {selectedWeek.toDateString()}</span>
              <button onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Next Week →</button>
            </div>
            {dailyActivities.map(activity => (
              <div key={activity.date} onClick={() => setSelectedDay(activity)} style={{ marginBottom: '10px', padding: '12px', background: '#fff', borderRadius: '8px', cursor: 'pointer', border: '2px solid #a5b4fc', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.1)' }}>
                <strong style={{ color: '#3730a3' }}>{activity.date}:</strong> {activity.classwork}
              </div>
            ))}
            {selectedDay && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '2px solid #a5b4fc' }}>
                <h4 style={{ color: '#3730a3', fontWeight: '700' }}>📋 Details for {selectedDay.date}</h4>
                <p><strong>✏️ Classwork:</strong> {selectedDay.classwork}</p>
                <p><strong>📝 Homework:</strong> {selectedDay.homework}</p>
                <p><strong>🎯 Topics:</strong> {selectedDay.topics.join(', ')}</p>
              </div>
            )}
          </div>
        );
      case 'gallery':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', border: '2px solid #0284c7' }}>
            <h3 style={{ color: '#0c4a6e', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>🖼️ Photo Gallery</h3>
            {photoGallery.map(album => (
              <div key={album.event} style={{ marginBottom: '20px', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <h4 style={{ color: '#0c4a6e', fontWeight: '700', marginBottom: '12px' }}>{album.event}</h4>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {album.photos.map(photo => <img key={photo} src={`https://via.placeholder.com/150?text=${photo}`} alt={photo} style={{ borderRadius: '8px', border: '2px solid #0284c7' }} />)}
                </div>
              </div>
            ))}
          </div>
        );
      case 'fees':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)', border: '2px solid #10b981', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)' }}>
            <h3 style={{ color: '#166534', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>💳 Fee Details</h3>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}><strong>💰 Total Fee:</strong> ₹{feeDetails.totalFee.toLocaleString()}</p>
              <p style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#10b981' }}><strong>✓ Paid:</strong> ₹{feeDetails.paid.toLocaleString()}</p>
              <p style={{ fontSize: '1.1rem', color: '#ef4444' }}><strong>⏳ Balance:</strong> ₹{feeDetails.balance.toLocaleString()}</p>
            </div>
            <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '12px' }}>📅 Instalments</h4>
            {feeDetails.instalments.map((inst, index) => (
              <div key={index} style={{ background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: `2px solid ${inst.status === 'paid' ? '#dcfce7' : '#fef3c7'}` }}>
                <p><strong>{inst.dueDate}:</strong> ₹{inst.amount.toLocaleString()} - <span style={{ background: inst.status === 'paid' ? '#10b981' : '#f59e0b', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '0.9rem' }}>{inst.status.toUpperCase()}</span></p>
              </div>
            ))}
            <button style={{ padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem', marginTop: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>💳 Pay Now</button>
          </div>
        );
      case 'report':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #fbbf24', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ color: '#92400e', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>📑 Report Card</h3>
            {reportCard.exams.map(exam => (
              <div key={exam.name} style={{ marginBottom: '20px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                <h4 style={{ color: '#92400e', fontWeight: '700', marginBottom: '12px' }}>{exam.name}</h4>
                {Object.entries(exam.subjects).map(([subject, marks]) => (
                  <p key={subject} style={{ margin: '8px 0' }}><strong>{subject}:</strong> <span style={{ background: marks >= 80 ? '#dcfce7' : marks >= 60 ? '#fef3c7' : '#fee2e2', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>{marks}/100</span></p>
                ))}
              </div>
            ))}
          </div>
        );
      case 'contact':
        return (
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)', border: '2px solid #6b7280' }}>
            <h3 style={{ color: '#374151', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>📞 Contact Us</h3>
            {contacts.map(contact => (
              <div key={contact.role} style={{ marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(107, 114, 128, 0.1)' }}>
                <p style={{ margin: '0 0 6px' }}><strong style={{ color: '#374151' }}>👤 {contact.role}:</strong> {contact.name}</p>
                <p style={{ margin: 0 }}><strong>📧 Email:</strong> <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>{contact.email}</a></p>
              </div>
            ))}
          </div>
        );
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1240px', margin: '0 auto', color: '#1f2937', background: 'linear-gradient(to bottom, #f0f9ff 0%, #f9fafb 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ fontSize: '1.8rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>👨‍👩‍👧 Parents Portal - SMT School, Thane</h2>
        <p style={{ color: '#475569', marginTop: '8px', fontSize: '1rem', fontWeight: '500' }}>
          📊 Access your child's academic information, attendance, fees, and school updates.
        </p>
      </section>
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '8px' }}>
        {[
          { key: 'profile', label: '👤 Student Profile' },
          { key: 'parent-profile', label: '👨‍💼 Parent Profile' },
          { key: 'attendance', label: '📅 Attendance' },
          { key: 'timetable', label: '⏰ Timetable' },
          { key: 'events', label: '🎉 Events' },
          { key: 'activities', label: '📚 Activities' },
          { key: 'gallery', label: '🖼️ Gallery' },
          { key: 'fees', label: '💳 Fees' },
          { key: 'report', label: '📑 Report Card' },
          { key: 'contact', label: '📞 Contact' },
        ].map(module => (
          <button key={module.key} onClick={() => setActiveModule(module.key)} style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid #cbd5e1', background: activeModule === module.key ? '#1e40af' : '#fff', color: activeModule === module.key ? '#fff' : '#1f2937', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600', transition: 'all 0.3s', boxShadow: activeModule === module.key ? '0 4px 12px rgba(30, 64, 175, 0.3)' : 'none' }}>
            {module.label}
          </button>
        ))}
      </nav>
      {renderModule()}
    </main>
  );
};

export default Parents;