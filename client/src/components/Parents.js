import React, { useState } from 'react';

const Parents = () => {
  const [activeModule, setActiveModule] = useState('profile');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Dummy data for Thane, Maharashtra CBSE school
  const studentProfile = {
    name: 'Aarav Sharma',
    grade: 'Grade 7',
    division: 'A',
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

  const attendanceData = [
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
    // Add more days...
  ];

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
    // Add other days...
  ];

  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-03-15', type: 'past', photos: ['sports1.jpg', 'sports2.jpg'], takeaways: 'Great participation, Aarav won 100m race silver medal', details: 'Held at school ground, 200 students participated' },
    { id: 2, title: 'PTM Meeting', date: '2026-04-20', type: 'upcoming', preparation: 'Prepare progress report discussion, bring any concerns', details: 'Meeting with class teacher and subject teachers' },
    { id: 3, title: 'Science Exhibition', date: '2026-05-10', type: 'upcoming', preparation: 'Help child prepare project on renewable energy', details: 'Inter-school competition, theme: Future of Energy' },
  ];

  const dailyActivities = [
    { date: '2026-04-14', classwork: 'Algebra equations practice', homework: 'Solve 20 problems from textbook pg 45', topics: ['Linear equations', 'Word problems'], projects: 'Math project on real-life applications due next week', attachments: ['worksheet.pdf'] },
    { date: '2026-04-15', classwork: 'English comprehension', homework: 'Write essay on My Hobby', topics: ['Grammar', 'Creative writing'], projects: 'Science model preparation', attachments: ['essay_guidelines.pdf'] },
    // Add more...
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

  const renderModule = () => {
    switch (activeModule) {
      case 'profile':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Student Profile</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <img src={studentProfile.photo} alt="Student" onClick={() => setSelectedStudent(studentProfile)} style={{ cursor: 'pointer', borderRadius: '50%', width: '100px', height: '100px' }} />
              <div>
                <p><strong>Name:</strong> {studentProfile.name}</p>
                <p><strong>Grade:</strong> {studentProfile.grade} {studentProfile.division}</p>
                <p><strong>Roll No:</strong> {studentProfile.rollNo}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px' }}>
                <h4>Detailed Profile</h4>
                <p><strong>DOB:</strong> {selectedStudent.dob}</p>
                <p><strong>Address:</strong> {selectedStudent.address}</p>
                <p><strong>Phone:</strong> {selectedStudent.phone}</p>
                <p><strong>Email:</strong> {selectedStudent.email}</p>
                <p><strong>Blood Group:</strong> {selectedStudent.bloodGroup}</p>
                <p><strong>Emergency Contact:</strong> {selectedStudent.emergencyContact}</p>
                <p><strong>Admission Date:</strong> {selectedStudent.admissionDate}</p>
                <p><strong>Father:</strong> {selectedStudent.fatherName}</p>
                <p><strong>Mother:</strong> {selectedStudent.motherName}</p>
                <p><strong>Siblings:</strong> {selectedStudent.siblings.join(', ')}</p>
              </div>
            )}
          </div>
        );
      case 'parent-profile':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Parent Profile</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <img src={parentProfile.photo} alt="Parent" onClick={() => setSelectedStudent(parentProfile)} style={{ cursor: 'pointer', borderRadius: '50%', width: '100px', height: '100px' }} />
              <div>
                <p><strong>Name:</strong> {parentProfile.name}</p>
                <p><strong>Relation:</strong> {parentProfile.relation}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px' }}>
                <h4>Detailed Profile</h4>
                <p><strong>Phone:</strong> {selectedStudent.phone}</p>
                <p><strong>Email:</strong> {selectedStudent.email}</p>
                <p><strong>Occupation:</strong> {selectedStudent.occupation}</p>
                <p><strong>Company:</strong> {selectedStudent.company}</p>
                <p><strong>Address:</strong> {selectedStudent.address}</p>
              </div>
            )}
          </div>
        );
      case 'attendance':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Attendance Details</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}>Previous Month</button>
              <span>{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}>Next Month</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} style={{ textAlign: 'center', fontWeight: 'bold' }}>{day}</div>)}
              {attendanceData.map(day => (
                <div key={day.date} style={{
                  backgroundColor: getStatusColor(day.status, day.type),
                  padding: '10px', border: '1px solid #ccc', textAlign: 'center', color: '#fff', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} title={day.reason || day.status}>
                  {new Date(day.date).getDate()}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px' }}>
              <p><span style={{ backgroundColor: '#10b981', padding: '2px 5px', color: '#fff' }}>Present</span></p>
              <p><span style={{ backgroundColor: '#f59e0b', padding: '2px 5px', color: '#fff' }}>Absent (Advance)</span></p>
              <p><span style={{ backgroundColor: '#ef4444', padding: '2px 5px', color: '#fff' }}>Absent (Impromptu)</span></p>
              <p><span style={{ backgroundColor: '#6b7280', padding: '2px 5px', color: '#fff' }}>Holiday</span></p>
            </div>
          </div>
        );
      case 'timetable':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Weekly Timetable - Grade 7A</h3>
            {timetable.map(day => (
              <div key={day.day} style={{ marginBottom: '20px' }}>
                <h4>{day.day}</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {day.periods.map(period => (
                    <div key={period.time} onClick={() => alert(`Subject: ${period.subject}\nTeacher: ${period.teacher}\nDetails: ${period.details}`)} style={{ padding: '10px', background: '#fff', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                      <strong>{period.time}:</strong> {period.subject} - {period.teacher}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 'events':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Event Calendar</h3>
            {events.map(event => (
              <div key={event.id} style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4>{event.title} - {event.date}</h4>
                <p><strong>Type:</strong> {event.type === 'past' ? 'Past Event' : 'Upcoming Event'}</p>
                {event.type === 'past' ? (
                  <div>
                    <p><strong>Photos:</strong> {event.photos.map(photo => <img key={photo} src={`https://via.placeholder.com/100?text=${photo}`} alt={photo} style={{ margin: '5px' }} />)}</p>
                    <p><strong>Takeaways:</strong> {event.takeaways}</p>
                    <p><strong>Details:</strong> {event.details}</p>
                  </div>
                ) : (
                  <div>
                    <p><strong>Preparation:</strong> {event.preparation}</p>
                    <p><strong>Details:</strong> {event.details}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case 'activities':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Daily Activities</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}>Previous Week</button>
              <span>Week of {selectedWeek.toDateString()}</span>
              <button onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}>Next Week</button>
            </div>
            {dailyActivities.map(activity => (
              <div key={activity.date} onClick={() => setSelectedDay(activity)} style={{ marginBottom: '10px', padding: '10px', background: '#fff', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                <strong>{activity.date}:</strong> {activity.classwork}
              </div>
            ))}
            {selectedDay && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px' }}>
                <h4>Details for {selectedDay.date}</h4>
                <p><strong>Classwork:</strong> {selectedDay.classwork}</p>
                <p><strong>Homework:</strong> {selectedDay.homework}</p>
                <p><strong>Topics:</strong> {selectedDay.topics.join(', ')}</p>
                <p><strong>Projects:</strong> {selectedDay.projects}</p>
                <p><strong>Attachments:</strong> {selectedDay.attachments.join(', ')}</p>
              </div>
            )}
          </div>
        );
      case 'gallery':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Photo Gallery</h3>
            {photoGallery.map(album => (
              <div key={album.event} style={{ marginBottom: '20px' }}>
                <h4>{album.event}</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {album.photos.map(photo => <img key={photo} src={`https://via.placeholder.com/150?text=${photo}`} alt={photo} style={{ borderRadius: '8px' }} />)}
                </div>
              </div>
            ))}
          </div>
        );
      case 'fees':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Fee Details</h3>
            <p><strong>Total Fee:</strong> ₹{feeDetails.totalFee}</p>
            <p><strong>Paid:</strong> ₹{feeDetails.paid}</p>
            <p><strong>Balance:</strong> ₹{feeDetails.balance}</p>
            <h4>Instalments</h4>
            {feeDetails.instalments.map((inst, index) => (
              <p key={index}>{inst.dueDate}: ₹{inst.amount} - {inst.status}</p>
            ))}
            <button style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Pay Now</button>
          </div>
        );
      case 'report':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Report Card</h3>
            {reportCard.exams.map(exam => (
              <div key={exam.name} style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px' }}>
                <h4>{exam.name}</h4>
                {Object.entries(exam.subjects).map(([subject, marks]) => (
                  <p key={subject}><strong>{subject}:</strong> {marks}/100</p>
                ))}
              </div>
            ))}
            <h4>Co-curricular Assessments</h4>
            {Object.entries(reportCard.assessments).map(([category, marks]) => (
              <p key={category}><strong>{category.charAt(0).toUpperCase() + category.slice(1)}:</strong> {marks}/100</p>
            ))}
          </div>
        );
      case 'contact':
        return (
          <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>Contact Us</h3>
            {contacts.map(contact => (
              <div key={contact.role} style={{ marginBottom: '10px', padding: '10px', background: '#fff', borderRadius: '8px' }}>
                <p><strong>{contact.role}:</strong> {contact.name}</p>
                <p><strong>Email:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>
              </div>
            ))}
          </div>
        );
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <main style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Parents Portal - SMT School, Thane</h2>
        <p style={{ color: '#475569', marginTop: '8px' }}>
          Access your child's academic information, attendance, fees, and school updates.
        </p>
      </section>
      <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'profile', label: 'Student Profile' },
          { key: 'parent-profile', label: 'Parent Profile' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'timetable', label: 'Timetable' },
          { key: 'events', label: 'Events' },
          { key: 'activities', label: 'Daily Activities' },
          { key: 'gallery', label: 'Photo Gallery' },
          { key: 'fees', label: 'Fees' },
          { key: 'report', label: 'Report Card' },
          { key: 'contact', label: 'Contact Us' },
        ].map(module => (
          <button key={module.key} onClick={() => setActiveModule(module.key)} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: activeModule === module.key ? '#3b82f6' : '#fff', color: activeModule === module.key ? '#fff' : '#0f172a', cursor: 'pointer' }}>
            {module.label}
          </button>
        ))}
      </nav>
      {renderModule()}
    </main>
  );
};

export default Parents;