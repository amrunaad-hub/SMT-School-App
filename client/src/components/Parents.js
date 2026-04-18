import React, { useEffect, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';

const Parents = () => {
  const [activeModule, setActiveModule] = useState('profile');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState('S-7A-15');
  const [selectedActivityDate, setSelectedActivityDate] = useState(new Date(2026, 3, 15));
  const [selectedTimetableDate, setSelectedTimetableDate] = useState(new Date(2026, 3, 15));
  const [activityMonth, setActivityMonth] = useState(new Date(2026, 3, 1));
  const [timetableMonth, setTimetableMonth] = useState(new Date(2026, 3, 1));
  const [activityView, setActivityView] = useState('classwork');
  const [activitySearch, setActivitySearch] = useState('');
  const [circularSearch, setCircularSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setSelectedStudent(null);
  }, [selectedChildId]);

  // Parent login linked to multiple children
  const linkedStudents = useMemo(() => [
    {
      id: 'S-7A-15',
      name: 'Aarav Kulkarni',
      grade: 'Grade 7',
      division: 'Alpha',
      rollNo: '7A-15',
      dob: '2015-03-15',
      address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
      phone: '+91 98765 43210',
      email: 'aarav.kulkarni@email.com',
      bloodGroup: 'O+',
      emergencyContact: 'Mrs. Priya Kulkarni (Mother) - +91 98765 43211',
      photo: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aarav-Kulkarni',
      admissionDate: '2020-06-01',
    },
    {
      id: 'S-5B-08',
      name: 'Ananya Kulkarni',
      grade: 'Grade 5',
      division: 'Beta',
      rollNo: '5B-08',
      dob: '2017-09-22',
      address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
      phone: '+91 98765 43212',
      email: 'ananya.kulkarni@email.com',
      bloodGroup: 'A+',
      emergencyContact: 'Mr. Rajesh Kulkarni (Father) - +91 98765 43211',
      photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ananya-Kulkarni',
      admissionDate: '2022-06-01',
    },
    {
      id: 'S-3A-21',
      name: 'Vihaan Kulkarni',
      grade: 'Grade 3',
      division: 'Alpha',
      rollNo: '3A-21',
      dob: '2019-01-11',
      address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
      phone: '+91 98765 43213',
      email: 'vihaan.kulkarni@email.com',
      bloodGroup: 'B+',
      emergencyContact: 'Mrs. Priya Kulkarni (Mother) - +91 98765 43211',
      photo: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Vihaan-Kulkarni',
      admissionDate: '2024-06-01',
    },
  ], []);

  const currentStudent = linkedStudents.find((child) => child.id === selectedChildId) || linkedStudents[0];

  const parentProfile = {
    name: 'Mr. Rajesh Kulkarni',
    relation: 'Father',
    phone: '+91 98765 43211',
    email: 'rajesh.kulkarni@email.com',
    occupation: 'Software Engineer',
    company: 'Tech Solutions Pvt Ltd, Thane',
    address: 'Flat 203, Rose Garden Apartments, Thane West, Maharashtra - 400601',
    photo: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rajesh-Kulkarni',
  };

  // Extended attendance data (memoized to prevent dependency issues)
  const fullAttendanceData = useMemo(() => [
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
  ], []);

  // Get last 10 days of attendance
  const last10DaysAttendance = useMemo(() => {
    return fullAttendanceData.slice(-10);
  }, [fullAttendanceData]);

  const timetable = [
    { date: '2026-04-14', time: '08:00-08:40', period: 'Period 1', subject: 'English', teacher: 'Ms. Anuja Kulkarni', details: 'Grammar and comprehension', attachments: [] },
    { date: '2026-04-14', time: '08:45-09:25', period: 'Period 2', subject: 'Mathematics', teacher: 'Mr. Shrirang Joshi', details: 'Algebra equations', attachments: [] },
    { date: '2026-04-15', time: '08:00-08:40', period: 'Period 1', subject: 'Science', teacher: 'Ms. Nandini Ranade', details: 'Video: Eating habits of animals', attachments: ['science-video-link.txt'] },
    { date: '2026-04-15', time: '08:45-09:25', period: 'Period 2', subject: 'Hindi', teacher: 'Ms. Revati Apte', details: 'Notebook notes discussion', attachments: ['hindi-notes.pdf'] },
    { date: '2026-04-16', time: '08:00-08:40', period: 'Period 1', subject: 'Social Studies', teacher: 'Mr. Akshay Deshmukh', details: 'Map reading practice', attachments: [] },
    { date: '2026-04-16', time: '08:45-09:25', period: 'Period 2', subject: 'ICT', teacher: 'Ms. Kinjal Shah', details: 'Practical lab activity', attachments: ['ict-practice-sheet.docx'] },
    { date: '2026-04-17', time: '08:00-08:40', period: 'Period 1', subject: 'Marathi', teacher: 'Ms. Madhuri Lakhapati', details: 'Poem reading and explanation', attachments: [] },
    { date: '2026-04-17', time: '08:45-09:25', period: 'Period 2', subject: 'Library', teacher: 'Ms. Sanika Khade', details: 'Story telling session', attachments: [] },
  ];

  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-03-15', type: 'past', photos: ['sports1.jpg', 'sports2.jpg'], takeaways: 'Great participation, Aarav won 100m race silver medal', details: 'Held at school ground, 200 students participated' },
    { id: 2, title: 'PTM Meeting', date: '2026-04-20', type: 'upcoming', preparation: 'Prepare progress report discussion, bring any concerns', details: 'Meeting with class teacher and subject teachers' },
    { id: 3, title: 'Science Exhibition', date: '2026-05-10', type: 'upcoming', preparation: 'Help child prepare project on renewable energy', details: 'Inter-school competition, theme: Future of Energy' },
  ];

  const dailyActivities = [
    { date: '2026-04-14', period: 'Period 1 - Science', classwork: 'Dictation practice completed in class.', homework: 'Revise categories: herbivore, carnivore, omnivore, producer, consumer.', topics: ['Animals', 'Food chain'], teacher: 'Ms. Saraswati Venkatesh', attachments: [] },
    { date: '2026-04-14', period: 'Period 2 - Hindi', classwork: 'Language notebook notes were discussed.', homework: 'Complete two notebook pages based on class examples.', topics: ['Bhasha', 'Lipi'], teacher: 'Ms. Prity Pandey', attachments: ['hindi-notebook-notes.pdf'] },
    { date: '2026-04-15', period: 'Period 3 - ICT', classwork: 'Practical conducted in computer lab.', homework: 'Write definitions of hardware and software.', topics: ['ICT basics'], teacher: 'Ms. Kinjal Shah', attachments: [] },
    { date: '2026-04-16', period: 'Period 4 - Physical Education', classwork: 'Warm-up and agility drills done.', homework: 'Practice breathing exercise for 10 minutes.', topics: ['Fitness'], teacher: 'Mr. Omkar Patil', attachments: [] },
    { date: '2026-04-17', period: 'Period 5 - English', classwork: 'Collective noun workbook practice.', homework: 'Write wrong dictation words 5 times each.', topics: ['Grammar'], teacher: 'Ms. Pooja Maheshwari', attachments: ['dictation-list.docx'] },
  ];

  const circularNotices = [
    {
      date: '2026-04-13',
      title: 'Introductory PTM Circular',
      body: 'Parent-Teacher Meeting is scheduled on 18 April 2026. Please join as per allotted time slot for academic planning discussion.',
      attachments: ['ptm-circular.pdf'],
    },
    {
      date: '2026-04-10',
      title: 'Transport & Dispersal Instructions',
      body: 'Please verify transport route number and dispersal gate details. Any changes should be notified in writing before Monday.',
      attachments: ['transport-guidelines.pdf'],
    },
  ];

  const campusMessages = [
    {
      date: '2026-04-08',
      title: 'Healthy Tiffin and Birthday Notice',
      body: 'We encourage nutritious home-prepared tiffin and request parents to avoid processed food in school lunch boxes.',
      attachments: ['healthy-tiffin-circular.pdf'],
    },
    {
      date: '2026-04-06',
      title: 'School Safety Drill Update',
      body: 'A planned safety drill will be conducted this week. Students have been briefed by class teachers.',
      attachments: [],
    },
  ];

  const photoGallery = [
    { event: 'Sports Day 2026', photos: ['sports1.jpg', 'sports2.jpg', 'sports3.jpg'] },
    { event: 'PTM March 2026', photos: ['ptm1.jpg', 'ptm2.jpg'] },
    { event: 'Annual Day 2025', photos: ['annual1.jpg', 'annual2.jpg', 'annual3.jpg'] },
  ];

  const feeDetailsByStudent = useMemo(() => ({
    'S-7A-15': {
      totalFee: 90000,
      instalments: [
        { id: 'RCP-7A-APR', dueDate: '2026-04-01', amount: 30000, status: 'paid', paidOn: '2026-03-29', mode: 'UPI' },
        { id: 'RCP-7A-JUL', dueDate: '2026-07-01', amount: 30000, status: 'pending' },
        { id: 'RCP-7A-NOV', dueDate: '2026-11-01', amount: 30000, status: 'pending' },
      ],
      paid: 30000,
      balance: 60000,
    },
    'S-5B-08': {
      totalFee: 78000,
      instalments: [
        { id: 'RCP-5B-APR', dueDate: '2026-04-01', amount: 26000, status: 'paid', paidOn: '2026-03-30', mode: 'NetBanking' },
        { id: 'RCP-5B-JUL', dueDate: '2026-07-01', amount: 26000, status: 'pending' },
        { id: 'RCP-5B-NOV', dueDate: '2026-11-01', amount: 26000, status: 'pending' },
      ],
      paid: 26000,
      balance: 52000,
    },
    'S-3A-21': {
      totalFee: 72000,
      instalments: [
        { id: 'RCP-3A-APR', dueDate: '2026-04-01', amount: 24000, status: 'paid', paidOn: '2026-03-31', mode: 'Card' },
        { id: 'RCP-3A-JUL', dueDate: '2026-07-01', amount: 24000, status: 'pending' },
        { id: 'RCP-3A-NOV', dueDate: '2026-11-01', amount: 24000, status: 'pending' },
      ],
      paid: 24000,
      balance: 48000,
    },
  }), []);

  const currentFeeDetails = feeDetailsByStudent[currentStudent.id] || feeDetailsByStudent['S-7A-15'];

  const formatCurrency = (amount) => `Rs. ${amount.toLocaleString('en-IN')}`;

  const addReceiptPageToDoc = (doc, student, instalment, pageIndex, totalPages) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(30, 64, 175);
    doc.roundedRect(14, 12, 18, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SMT', 23, 23, { align: 'center' });

    doc.setTextColor(30, 64, 175);
    doc.setFontSize(12);
    doc.text('SMT SCHOOL, THANE', 36, 19);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('Academic Excellence | Discipline | Character', 36, 25);

    let y = 38;
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SMT SCHOOL - FEE PAYMENT RECEIPT', 14, y);

    y += 8;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.6);
    doc.line(14, y, 196, y);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const lines = [
      `Receipt No: ${instalment.id}`,
      `Student Name: ${student.name}`,
      `Grade / Division: ${student.grade} ${student.division}`,
      `Roll No: ${student.rollNo}`,
      `Amount Paid: ${formatCurrency(instalment.amount)}`,
      `Payment Date: ${instalment.paidOn || 'N/A'}`,
      `Payment Mode: ${instalment.mode || 'N/A'}`,
      `Installment Due Date: ${instalment.dueDate}`,
      `Generated On: ${new Date().toLocaleString('en-IN')}`,
    ];

    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(14, y, 182, 18);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text('School Seal: Digitally generated by SMT ERP', 17, y + 8);
    doc.text('This is a system-generated receipt and does not require manual stamp.', 17, y + 14);

    const signatureLineY = pageHeight - 35;
    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.4);
    doc.line(136, signatureLineY, 192, signatureLineY);
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.text('Authorized Signatory', 136, signatureLineY + 6);
    doc.setFont('helvetica', 'italic');
    doc.text('Accounts Department', 136, signatureLineY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`Page ${pageIndex + 1} of ${totalPages}`, 14, pageHeight - 12);
  };

  const buildReceiptPdf = (entries, filename) => {
    if (!entries.length) {
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    entries.forEach((entry, index) => {
      addReceiptPageToDoc(doc, entry.student, entry.instalment, index, entries.length);
    });
    doc.save(filename);
  };

  const getPaidReceiptEntriesForStudent = (student) => {
    const feeData = feeDetailsByStudent[student.id];
    if (!feeData) {
      return [];
    }

    return feeData.instalments
      .filter((instalment) => instalment.status === 'paid')
      .map((instalment) => ({ student, instalment }));
  };

  const openSingleReceiptPreview = (instalment) => {
    setReceiptPreview({
      type: 'single',
      title: 'Receipt Preview',
      description: `Download 1 receipt for ${currentStudent.name}.`,
      entries: [{ student: currentStudent, instalment }],
      fileName: `${instalment.id}-${currentStudent.rollNo}.pdf`,
    });
  };

  const openCurrentStudentAllReceiptsPreview = () => {
    const entries = getPaidReceiptEntriesForStudent(currentStudent);
    if (!entries.length) {
      return;
    }

    setReceiptPreview({
      type: 'student-all',
      title: 'Receipt Preview',
      description: `Download ${entries.length} paid receipt(s) for ${currentStudent.name}.`,
      entries,
      fileName: `${currentStudent.rollNo}-all-paid-receipts.pdf`,
    });
  };

  const openAllChildrenReceiptsPreview = () => {
    const allEntries = linkedStudents.flatMap((student) => getPaidReceiptEntriesForStudent(student));
    if (!allEntries.length) {
      return;
    }

    setReceiptPreview({
      type: 'all-children',
      title: 'Receipt Preview',
      description: `Download ${allEntries.length} paid receipt(s) for all linked children.`,
      entries: allEntries,
      fileName: 'all-children-paid-receipts.pdf',
    });
  };

  const closeReceiptPreview = () => setReceiptPreview(null);

  const confirmReceiptDownload = () => {
    if (!receiptPreview) {
      return;
    }

    buildReceiptPdf(receiptPreview.entries, receiptPreview.fileName);
    closeReceiptPreview();
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
    { role: 'PTA Member', name: 'Mr. Kulkarni', email: 'pta@smtthane.edu' },
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

  const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const isSameDate = (left, right) => formatDateKey(left) === formatDateKey(right);

  const changeMonthKeepingDay = (month, setMonth, selectedDate, setSelectedDate, delta) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(selectedDate.getDate(), maxDay));
    setMonth(nextMonth);
    setSelectedDate(nextDate);
  };

  const buildWeekStrip = (selectedDate) => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  };

  const activityWeekStrip = buildWeekStrip(selectedActivityDate);
  const timetableWeekStrip = buildWeekStrip(selectedTimetableDate);

  const selectedActivityEntries = dailyActivities.filter((activity) => {
    if (activity.date !== formatDateKey(selectedActivityDate)) {
      return false;
    }

    if (!activitySearch.trim()) {
      return true;
    }

    const query = activitySearch.toLowerCase();
    return `${activity.period} ${activity.classwork} ${activity.homework} ${activity.teacher}`.toLowerCase().includes(query);
  });

  const selectedTimetableEntries = timetable.filter((entry) => entry.date === formatDateKey(selectedTimetableDate));

  const filteredCircularNotices = circularNotices.filter((notice) => {
    const query = circularSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return `${notice.title} ${notice.body} ${notice.date}`.toLowerCase().includes(query);
  });

  const filteredCampusMessages = campusMessages.filter((message) => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return `${message.title} ${message.body} ${message.date}`.toLowerCase().includes(query);
  });

  const openAttachmentPreview = (title, attachments) => {
    if (!attachments || !attachments.length) {
      return;
    }
    setAttachmentPreview({ title, attachments });
  };

  const portalModules = [
    { key: 'profile', label: 'Student Profile', icon: '👤' },
    { key: 'parent-profile', label: 'Parent Profile', icon: '👨‍👩‍👧' },
    { key: 'attendance', label: 'Attendance', icon: '📅' },
    { key: 'timetable', label: 'Timetable', icon: '⏰' },
    { key: 'activities', label: 'Student Activity', icon: '📚' },
    { key: 'circular', label: 'Ecampus Circular', icon: '📢' },
    { key: 'message', label: 'Ecampus Message', icon: '💬' },
    { key: 'fees', label: 'Fees', icon: '💳' },
    { key: 'events', label: 'Events', icon: '🎉' },
    { key: 'gallery', label: 'Photo Gallery', icon: '🖼️' },
    { key: 'report', label: 'Report Card', icon: '📑' },
    { key: 'contact', label: 'Contact Us', icon: '📞' },
  ];

  const primaryQuickModules = portalModules.filter((module) => ['profile', 'parent-profile', 'attendance', 'timetable', 'activities', 'circular', 'message', 'fees'].includes(module.key));

  const renderModule = () => {
    switch (activeModule) {
      case 'profile':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)', border: '2px solid #0ea5e9', boxShadow: '0 4px 16px rgba(6, 182, 212, 0.1)' }}>
            <h3 style={{ color: '#0369a1', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>👤 Student Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '16px' }}>
              <img src={currentStudent.photo} alt="Student" onClick={() => setSelectedStudent(currentStudent)} style={{ cursor: 'pointer', borderRadius: '12px', width: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', border: '4px solid #0ea5e9', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }} />
              <div style={{ width: '100%', textAlign: isMobile ? 'center' : 'left' }}>
                <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', marginBottom: '8px' }}><strong>👨 Name:</strong> {currentStudent.name}</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '8px' }}><strong>📚 Grade:</strong> {currentStudent.grade} {currentStudent.division}</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '8px' }}><strong>🎫 Roll No:</strong> {currentStudent.rollNo}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: isMobile ? '14px' : '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <h4 style={{ color: '#0369a1', fontWeight: '600', fontSize: isMobile ? '1.05rem' : '1.1rem' }}>📋 Detailed Profile</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '8px' : '12px' }}>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>🎂 DOB:</strong> {selectedStudent.dob}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>📍 Address:</strong> {selectedStudent.address}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>☎️ Phone:</strong> {selectedStudent.phone}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>📧 Email:</strong> {selectedStudent.email}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>🩸 Blood Group:</strong> {selectedStudent.bloodGroup}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>🚨 Emergency Contact:</strong> {selectedStudent.emergencyContact}</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'parent-profile':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)', border: '2px solid #6b7280' }}>
            <h3 style={{ color: '#374151', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>👨‍💼 Parent Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '16px' }}>
              <img src={parentProfile.photo} alt="Parent" onClick={() => setSelectedStudent(parentProfile)} style={{ cursor: 'pointer', borderRadius: '12px', width: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', border: '4px solid #6b7280', boxShadow: '0 4px 12px rgba(107, 114, 128, 0.2)' }} />
              <div style={{ width: '100%', textAlign: isMobile ? 'center' : 'left' }}>
                <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', marginBottom: '8px' }}><strong>👨 Name:</strong> {parentProfile.name}</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '8px' }}><strong>🔗 Relation:</strong> {parentProfile.relation}</p>
              </div>
            </div>
            {selectedStudent && (
              <div style={{ marginTop: '20px', padding: isMobile ? '14px' : '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ color: '#374151', fontWeight: '600', fontSize: isMobile ? '1.05rem' : '1.1rem' }}>📋 Detailed Profile</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '8px' : '12px' }}>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>☎️ Phone:</strong> {selectedStudent.phone}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>📧 Email:</strong> {selectedStudent.email}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>💼 Occupation:</strong> {selectedStudent.occupation}</p>
                  <p style={{ fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>🏢 Company:</strong> {selectedStudent.company}</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'attendance':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)', border: '2px solid #22c55e', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)' }}>
            <h3 style={{ color: '#166534', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📅 Attendance Calendar & History</h3>
            
            {/* Calendar */}
            <div style={{ marginBottom: '24px', background: '#fff', padding: isMobile ? '12px' : '20px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ padding: isMobile ? '6px 8px' : '8px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: isMobile ? '0.8rem' : '0.9rem', minHeight: '36px' }}>← Prev</button>
                <h4 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', color: '#166534', fontWeight: '700' }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ padding: isMobile ? '6px 8px' : '8px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: isMobile ? '0.8rem' : '0.9rem', minHeight: '36px' }}>Next →</button>
              </div>
              
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontWeight: '700', color: '#166534', padding: isMobile ? '4px' : '8px', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>{day}</div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {calendarDays.map((date, index) => {
                  const attendance = date ? getAttendanceForDate(date) : null;
                  const bgColor = !date ? '#f3f4f6' : attendance ? getStatusColor(attendance.status, attendance.type) : '#fafafa';
                  const isCurrentDate = date && new Date().toDateString() === date.toDateString();
                  
                  return (
                    <div key={index} style={{
                      backgroundColor: bgColor,
                      padding: isMobile ? '6px' : '10px',
                      border: isCurrentDate ? '3px solid #22c55e' : '1px solid #dcfce7',
                      borderRadius: '4px',
                      textAlign: 'center',
                      color: date ? '#1f2937' : '#d1d5db',
                      minHeight: isMobile ? '32px' : '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: date ? '600' : '400',
                      cursor: date && attendance ? 'help' : 'default',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      transition: 'all 0.2s'
                    }} title={attendance ? `${attendance.status.toUpperCase()} - ${attendance.reason || attendance.type}` : ''}>
                      {date ? date.getDate() : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background: '#fff', padding: isMobile ? '12px' : '16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '20px' }}>
              <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '10px', fontSize: isMobile ? '1rem' : '1.05rem' }}>Legend:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '6px' : '8px' }}>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><span style={{ backgroundColor: '#10b981', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontWeight: '600' }}>✓ Present</span></p>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontWeight: '600' }}>⚠ Advance</span></p>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontWeight: '600' }}>✕ Impromptu</span></p>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><span style={{ backgroundColor: '#6b7280', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontWeight: '600' }}>● Holiday</span></p>
              </div>
            </div>

            {/* Last 10 Days History */}
            <div>
              <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '10px', fontSize: isMobile ? '1.05rem' : '1.1rem' }}>📊 Last 10 Days History</h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {last10DaysAttendance.map((day) => {
                  const statusBg = getStatusColor(day.status, day.type);
                  const statusText = day.status === 'holiday' ? '🗓️ Holiday' : day.status === 'present' ? '✓ Present' : '✗ Absent';
                  
                  return (
                    <div key={day.date} style={{
                      padding: isMobile ? '10px' : '12px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: `2px solid ${statusBg}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: `0 2px 8px ${statusBg}25`,
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: 1, minWidth: isMobile ? '150px' : '200px' }}>
                        <strong style={{ color: '#166534', fontSize: isMobile ? '0.85rem' : '0.95rem' }}>{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                        <p style={{ margin: '2px 0 0', color: '#666', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{day.reason || day.type}</p>
                      </div>
                      <span style={{ background: statusBg, color: '#fff', padding: isMobile ? '4px 8px' : '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', whiteSpace: 'nowrap' }}>{statusText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 'timetable':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #fbbf24', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ color: '#92400e', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '12px' }}>⏰ Timetable</h3>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fcd34d', padding: isMobile ? '10px' : '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <button onClick={() => changeMonthKeepingDay(timetableMonth, setTimetableMonth, selectedTimetableDate, setSelectedTimetableDate, -1)} style={{ border: 'none', background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>←</button>
                <h4 style={{ margin: 0, color: '#92400e', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>{timetableMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => changeMonthKeepingDay(timetableMonth, setTimetableMonth, selectedTimetableDate, setSelectedTimetableDate, 1)} style={{ border: 'none', background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>→</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {timetableWeekStrip.map((date) => (
                  <button
                    key={formatDateKey(date)}
                    onClick={() => setSelectedTimetableDate(date)}
                    style={{
                      border: `1px solid ${isSameDate(date, selectedTimetableDate) ? '#f97316' : '#fcd34d'}`,
                      background: isSameDate(date, selectedTimetableDate) ? '#fb923c' : '#fff',
                      color: isSameDate(date, selectedTimetableDate) ? '#fff' : '#92400e',
                      borderRadius: '10px',
                      padding: '6px 2px',
                      cursor: 'pointer',
                      minHeight: '54px',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</div>
                  </button>
                ))}
              </div>
            </div>
            {selectedTimetableEntries.length ? selectedTimetableEntries.map((entry) => (
              <div key={`${entry.date}-${entry.period}-${entry.time}`} style={{ marginBottom: '10px', background: '#fff', padding: isMobile ? '12px' : '14px', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                <p style={{ margin: '0 0 6px', color: '#92400e', fontWeight: 800, fontSize: isMobile ? '0.9rem' : '0.95rem' }}>{entry.period} • {entry.subject}</p>
                <p style={{ margin: 0, color: '#7c2d12', fontSize: isMobile ? '0.8rem' : '0.88rem' }}>{entry.time} • {entry.teacher}</p>
                <p style={{ margin: '8px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{entry.details}</p>
                {entry.attachments.length > 0 && (
                  <button onClick={() => openAttachmentPreview(`${entry.period} Attachment`, entry.attachments)} style={{ marginTop: '8px', border: '1px solid #f59e0b', background: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {entry.attachments.length} Attachment</button>
                )}
              </div>
            )) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #fbbf24', color: '#92400e', fontWeight: 600 }}>No timetable entries for selected date.</div>
            )}
          </div>
        );
      case 'events':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fce7f3 0%, #fce7f3 100%)', border: '2px solid #ec4899', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.1)' }}>
            <h3 style={{ color: '#9d174d', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>🎉 Event Calendar</h3>
            {events.map(event => (
              <div key={event.id} style={{ marginBottom: '16px', padding: isMobile ? '12px' : '16px', background: '#fff', borderRadius: '12px', border: '2px solid #fbcfe8', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.1)' }}>
                <h4 style={{ color: '#9d174d', fontWeight: '700', marginBottom: '8px', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>{event.title}</h4>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.85rem' : '0.9rem' }}><strong>📅 Date:</strong> {event.date}</p>
                <p style={{ margin: '4px 0', fontSize: isMobile ? '0.85rem' : '0.9rem' }}><strong>📍 Type:</strong> {event.type === 'past' ? 'Past Event' : 'Upcoming Event'}</p>
                {event.type === 'past' ? (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><strong>📸 Takeaways:</strong> {event.takeaways}</p>
                  </div>
                ) : (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><strong>📝 Preparation:</strong> {event.preparation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case 'activities':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)', border: '2px solid #6366f1', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)' }}>
            <h3 style={{ color: '#3730a3', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📚 Daily Activities</h3>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c7d2fe', padding: isMobile ? '10px' : '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <button onClick={() => changeMonthKeepingDay(activityMonth, setActivityMonth, selectedActivityDate, setSelectedActivityDate, -1)} style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>←</button>
                <h4 style={{ margin: 0, color: '#3730a3', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>{activityMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => changeMonthKeepingDay(activityMonth, setActivityMonth, selectedActivityDate, setSelectedActivityDate, 1)} style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>→</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {activityWeekStrip.map((date) => (
                  <button
                    key={formatDateKey(date)}
                    onClick={() => setSelectedActivityDate(date)}
                    style={{
                      border: `1px solid ${isSameDate(date, selectedActivityDate) ? '#6366f1' : '#c7d2fe'}`,
                      background: isSameDate(date, selectedActivityDate) ? '#818cf8' : '#fff',
                      color: isSameDate(date, selectedActivityDate) ? '#fff' : '#3730a3',
                      borderRadius: '10px',
                      padding: '6px 2px',
                      cursor: 'pointer',
                      minHeight: '54px',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</div>
                  </button>
                ))}
              </div>
              <input
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search activity, subject, teacher"
                style={{ width: '100%', minHeight: '40px', border: '1px solid #c7d2fe', borderRadius: '999px', padding: '0 14px', fontSize: isMobile ? '0.85rem' : '0.9rem', outline: 'none' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '10px', border: '1px solid #c7d2fe', borderRadius: '999px', overflow: 'hidden' }}>
                <button onClick={() => setActivityView('classwork')} style={{ border: 'none', background: activityView === 'classwork' ? '#4f46e5' : '#eef2ff', color: activityView === 'classwork' ? '#fff' : '#3730a3', fontWeight: 700, padding: '9px 10px', cursor: 'pointer' }}>Class Work</button>
                <button onClick={() => setActivityView('homework')} style={{ border: 'none', background: activityView === 'homework' ? '#4f46e5' : '#eef2ff', color: activityView === 'homework' ? '#fff' : '#3730a3', fontWeight: 700, padding: '9px 10px', cursor: 'pointer' }}>Home Work</button>
              </div>
            </div>
            {selectedActivityEntries.length ? selectedActivityEntries.map((activity) => (
              <div key={`${activity.date}-${activity.period}`} style={{ marginBottom: '10px', padding: isMobile ? '10px' : '12px', background: '#fff', borderRadius: '10px', border: '1px solid #a5b4fc', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.1)' }}>
                <p style={{ margin: 0, color: '#3730a3', fontWeight: 800, fontSize: isMobile ? '0.9rem' : '0.95rem' }}>{activity.period}</p>
                <p style={{ margin: '6px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{activityView === 'classwork' ? activity.classwork : activity.homework}</p>
                <p style={{ margin: '8px 0 0', color: '#6366f1', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700 }}>👩‍🏫 {activity.teacher}</p>
                {activity.attachments.length > 0 && (
                  <button onClick={() => openAttachmentPreview(`${activity.period} Attachment`, activity.attachments)} style={{ marginTop: '8px', border: '1px solid #6366f1', background: '#eef2ff', color: '#3730a3', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {activity.attachments.length} Attachment</button>
                )}
              </div>
            )) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #6366f1', color: '#3730a3', fontWeight: 600 }}>No activities found for selected date/search.</div>
            )}
          </div>
        );
      case 'circular':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%)', border: '2px solid #fb7185', boxShadow: '0 4px 16px rgba(244, 63, 94, 0.1)' }}>
            <h3 style={{ color: '#9f1239', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '12px' }}>📢 Ecampus Circular</h3>
            <input
              value={circularSearch}
              onChange={(e) => setCircularSearch(e.target.value)}
              placeholder="Search circulars"
              style={{ width: '100%', minHeight: '40px', border: '1px solid #fda4af', borderRadius: '999px', padding: '0 14px', fontSize: isMobile ? '0.85rem' : '0.9rem', outline: 'none', marginBottom: '12px' }}
            />
            {filteredCircularNotices.length ? filteredCircularNotices.map((notice) => (
              <div key={`${notice.date}-${notice.title}`} style={{ marginBottom: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #fecdd3', padding: isMobile ? '12px' : '14px' }}>
                <p style={{ margin: 0, color: '#9f1239', fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1rem' }}>{notice.title}</p>
                <p style={{ margin: '4px 0 0', color: '#be123c', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{new Date(notice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p style={{ margin: '8px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.5 }}>{notice.body}</p>
                {notice.attachments.length > 0 && (
                  <button onClick={() => openAttachmentPreview(notice.title, notice.attachments)} style={{ marginTop: '8px', border: '1px solid #fb7185', background: '#fff1f2', color: '#9f1239', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {notice.attachments.length} Attachment</button>
                )}
              </div>
            )) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #fb7185', color: '#9f1239', fontWeight: 600 }}>No circulars found for this search.</div>
            )}
          </div>
        );
      case 'message':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #ffe4e6 0%, #fff1f2 100%)', border: '2px solid #f43f5e', boxShadow: '0 4px 16px rgba(244, 63, 94, 0.1)' }}>
            <h3 style={{ color: '#9f1239', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '12px' }}>💬 Ecampus Message</h3>
            <input
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              placeholder="Search messages"
              style={{ width: '100%', minHeight: '40px', border: '1px solid #fda4af', borderRadius: '999px', padding: '0 14px', fontSize: isMobile ? '0.85rem' : '0.9rem', outline: 'none', marginBottom: '12px' }}
            />
            {filteredCampusMessages.length ? filteredCampusMessages.map((message) => (
              <div key={`${message.date}-${message.title}`} style={{ marginBottom: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #fecdd3', padding: isMobile ? '12px' : '14px' }}>
                <p style={{ margin: 0, color: '#9f1239', fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1rem' }}>{message.title}</p>
                <p style={{ margin: '4px 0 0', color: '#be123c', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{new Date(message.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p style={{ margin: '8px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.5 }}>{message.body}</p>
                {message.attachments.length > 0 && (
                  <button onClick={() => openAttachmentPreview(message.title, message.attachments)} style={{ marginTop: '8px', border: '1px solid #fb7185', background: '#fff1f2', color: '#9f1239', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {message.attachments.length} Attachment</button>
                )}
              </div>
            )) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #fb7185', color: '#9f1239', fontWeight: 600 }}>No messages found for this search.</div>
            )}
          </div>
        );
      case 'gallery':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', border: '2px solid #0284c7' }}>
            <h3 style={{ color: '#0c4a6e', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>🖼️ Photo Gallery</h3>
            {photoGallery.map(album => (
              <div key={album.event} style={{ marginBottom: '16px', background: '#fff', padding: isMobile ? '12px' : '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <h4 style={{ color: '#0c4a6e', fontWeight: '700', marginBottom: '10px', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>{album.event}</h4>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollBehavior: 'smooth' }}>
                  {album.photos.map(photo => <img key={photo} src={`https://via.placeholder.com/120?text=${photo}`} alt={photo} style={{ borderRadius: '8px', border: '2px solid #0284c7', minWidth: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', objectFit: 'cover' }} />)}
                </div>
              </div>
            ))}
          </div>
        );
      case 'fees':
        {
          const paidInstalments = currentFeeDetails.instalments.filter((instalment) => instalment.status === 'paid');
          const allChildrenPaidEntries = linkedStudents.flatMap((student) => getPaidReceiptEntriesForStudent(student));

        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)', border: '2px solid #10b981', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)' }}>
            <h3 style={{ color: '#166534', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>💳 Fee Details</h3>
            <p style={{ marginTop: '-6px', marginBottom: '12px', color: '#166534', fontWeight: 600, fontSize: isMobile ? '0.88rem' : '0.95rem' }}>Student: {currentStudent.name} ({currentStudent.rollNo})</p>
            <div style={{ background: '#fff', padding: isMobile ? '12px' : '16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
              <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', marginBottom: '10px' }}><strong>💰 Total Fee:</strong> {formatCurrency(currentFeeDetails.totalFee)}</p>
              <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', marginBottom: '10px', color: '#10b981' }}><strong>✓ Paid:</strong> {formatCurrency(currentFeeDetails.paid)}</p>
              <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', color: '#ef4444' }}><strong>⏳ Balance:</strong> {formatCurrency(currentFeeDetails.balance)}</p>
            </div>
            <h4 style={{ color: '#166534', fontWeight: '700', marginBottom: '10px', fontSize: isMobile ? '1.05rem' : '1.1rem' }}>📅 Instalments</h4>
            {currentFeeDetails.instalments.map((inst, index) => (
              <div key={index} style={{ background: '#fff', padding: isMobile ? '10px' : '12px', borderRadius: '8px', marginBottom: '8px', border: `2px solid ${inst.status === 'paid' ? '#dcfce7' : '#fef3c7'}`, minHeight: isMobile ? '44px' : 'auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>{inst.dueDate}:</strong> {formatCurrency(inst.amount)}</p>
                  {inst.status === 'paid' && <p style={{ margin: '4px 0 0', fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#166534' }}>Paid on {inst.paidOn} via {inst.mode}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: inst.status === 'paid' ? '#10b981' : '#f59e0b', color: '#fff', padding: isMobile ? '4px 8px' : '6px 12px', borderRadius: '4px', fontWeight: '600', fontSize: isMobile ? '0.75rem' : '0.85rem', whiteSpace: 'nowrap' }}>{inst.status.toUpperCase()}</span>
                  {inst.status === 'paid' && (
                    <button onClick={() => openSingleReceiptPreview(inst)} style={{ padding: isMobile ? '7px 10px' : '8px 12px', borderRadius: '6px', border: '1px solid #059669', background: '#ecfdf5', color: '#065f46', fontWeight: 700, cursor: 'pointer', minHeight: '36px' }}>⬇ PDF Receipt</button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={openCurrentStudentAllReceiptsPreview}
              disabled={!paidInstalments.length}
              style={{
                padding: isMobile ? '10px 14px' : '11px 18px',
                borderRadius: '8px',
                border: '1px solid #0f766e',
                background: paidInstalments.length ? '#ccfbf1' : '#e5e7eb',
                color: paidInstalments.length ? '#115e59' : '#6b7280',
                fontWeight: 700,
                cursor: paidInstalments.length ? 'pointer' : 'not-allowed',
                marginTop: '8px',
                width: isMobile ? '100%' : 'auto',
                minHeight: '42px',
              }}
            >
              ⬇ Download All Paid Receipts (PDF)
            </button>
            <button
              onClick={openAllChildrenReceiptsPreview}
              disabled={!allChildrenPaidEntries.length}
              style={{
                padding: isMobile ? '10px 14px' : '11px 18px',
                borderRadius: '8px',
                border: '1px solid #1d4ed8',
                background: allChildrenPaidEntries.length ? '#dbeafe' : '#e5e7eb',
                color: allChildrenPaidEntries.length ? '#1e40af' : '#6b7280',
                fontWeight: 700,
                cursor: allChildrenPaidEntries.length ? 'pointer' : 'not-allowed',
                marginTop: '8px',
                width: isMobile ? '100%' : 'auto',
                minHeight: '42px',
              }}
            >
              ⬇ Download All Children Receipts (PDF)
            </button>
            <button style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: isMobile ? '0.9rem' : '1rem', marginTop: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', width: isMobile ? '100%' : 'auto', minHeight: '44px' }}>💳 Pay Now</button>
          </div>
        );
        }
      case 'report':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #fbbf24', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ color: '#92400e', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📑 Report Card</h3>
            {reportCard.exams.map(exam => (
              <div key={exam.name} style={{ marginBottom: '16px', padding: isMobile ? '12px' : '16px', background: '#fff', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                <h4 style={{ color: '#92400e', fontWeight: '700', marginBottom: '10px', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>{exam.name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '6px' : '8px' }}>
                  {Object.entries(exam.subjects).map(([subject, marks]) => (
                    <p key={subject} style={{ margin: '4px 0', fontSize: isMobile ? '0.8rem' : '0.85rem' }}><strong>{subject}:</strong> <span style={{ background: marks >= 80 ? '#dcfce7' : marks >= 60 ? '#fef3c7' : '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{marks}/100</span></p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 'contact':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)', border: '2px solid #6b7280' }}>
            <h3 style={{ color: '#374151', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📞 Contact Us</h3>
            {contacts.map(contact => (
              <div key={contact.role} style={{ marginBottom: '12px', padding: isMobile ? '12px' : '14px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(107, 114, 128, 0.1)', minHeight: isMobile ? '44px' : 'auto' }}>
                <p style={{ margin: '0 0 6px', fontSize: isMobile ? '0.9rem' : '0.95rem' }}><strong style={{ color: '#374151' }}>👤 {contact.role}:</strong> {contact.name}</p>
                <p style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.9rem' }}><strong>📧 Email:</strong> <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', wordBreak: 'break-all' }}>{contact.email}</a></p>
              </div>
            ))}
          </div>
        );
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <main style={{ padding: isMobile ? '12px 12px 80px' : '24px', maxWidth: '1240px', margin: '0 auto', color: '#1f2937', background: 'linear-gradient(180deg, #fff1f2 0%, #fff7ed 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section style={{ marginBottom: '16px' }}>
        <div style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid #fecdd3', boxShadow: '0 12px 28px rgba(244, 63, 94, 0.15)' }}>
          <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)', color: '#fff', padding: isMobile ? '14px' : '20px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.7rem', fontWeight: 800 }}>Parents Portal</h2>
            <p style={{ margin: '6px 0 0', color: '#ffe4e6', fontWeight: 600, fontSize: isMobile ? '0.84rem' : '0.95rem' }}>SMT School, Thane</p>
          </div>

          <div style={{ background: '#fff', padding: isMobile ? '12px' : '16px' }}>
            <div style={{ border: '1px solid #fecdd3', borderRadius: '12px', background: '#fff1f2', padding: isMobile ? '10px' : '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={currentStudent.photo} alt="Current Student" style={{ width: isMobile ? '52px' : '60px', height: isMobile ? '52px' : '60px', borderRadius: '12px', border: '2px solid #fb7185', background: '#fff' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#9f1239', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>{currentStudent.name}</p>
                  <p style={{ margin: '4px 0 0', color: '#be123c', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>{currentStudent.grade} • {currentStudent.division} • Roll {currentStudent.rollNo}</p>
                </div>
              </div>
            </div>

            <p style={{ margin: '0 0 8px', color: '#9f1239', fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.9rem' }}>Switch Student</p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {linkedStudents.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '999px',
                    border: `1px solid ${selectedChildId === child.id ? '#e11d48' : '#fda4af'}`,
                    background: selectedChildId === child.id ? '#e11d48' : '#fff',
                    color: selectedChildId === child.id ? '#fff' : '#9f1239',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '36px',
                  }}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '16px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '16px', padding: isMobile ? '12px' : '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#9f1239', fontSize: isMobile ? '1rem' : '1.1rem' }}>Quick Access</h3>
          <span style={{ fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#be123c', fontWeight: 600 }}>Linked Students: {linkedStudents.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, minmax(95px, 1fr))', gap: '8px' }}>
          {primaryQuickModules.map((module) => (
            <button
              key={module.key}
              onClick={() => setActiveModule(module.key)}
              style={{
                border: `1px solid ${activeModule === module.key ? '#fb7185' : '#fecdd3'}`,
                background: activeModule === module.key ? '#ffe4e6' : '#fff',
                borderRadius: '12px',
                padding: isMobile ? '8px 6px' : '10px 8px',
                minHeight: isMobile ? '72px' : '82px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: '#881337',
              }}
            >
              <span style={{ fontSize: isMobile ? '1.05rem' : '1.2rem' }}>{module.icon}</span>
              <span style={{ fontSize: isMobile ? '0.66rem' : '0.78rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{module.label}</span>
            </button>
          ))}
        </div>
      </section>

      {!isMobile && (
        <nav style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}>
          {portalModules.map((module) => (
            <button
              key={module.key}
              onClick={() => setActiveModule(module.key)}
              style={{
                padding: '10px 14px',
                borderRadius: '999px',
                border: `1px solid ${activeModule === module.key ? '#e11d48' : '#fda4af'}`,
                background: activeModule === module.key ? '#e11d48' : '#fff',
                color: activeModule === module.key ? '#fff' : '#881337',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {module.icon} {module.label}
            </button>
          ))}
        </nav>
      )}
      {renderModule()}

      {isMobile && (
        <>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            style={{
              position: 'fixed',
              right: '16px',
              bottom: '16px',
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: 'none',
              background: '#f43f5e',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 700,
              boxShadow: '0 12px 26px rgba(244, 63, 94, 0.45)',
              zIndex: 1100,
              cursor: 'pointer',
            }}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
          {isMenuOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 1090 }} onClick={() => setIsMenuOpen(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderTopLeftRadius: '18px', borderTopRightRadius: '18px', padding: '12px 14px 18px', boxShadow: '0 -10px 24px rgba(15, 23, 42, 0.25)' }}>
                <div style={{ width: '52px', height: '5px', borderRadius: '8px', background: '#e5e7eb', margin: '0 auto 12px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {portalModules.map((module) => (
                    <button
                      key={module.key}
                      onClick={() => {
                        setActiveModule(module.key);
                        setIsMenuOpen(false);
                      }}
                      style={{
                        border: `1px solid ${activeModule === module.key ? '#fb7185' : '#fecdd3'}`,
                        background: activeModule === module.key ? '#ffe4e6' : '#fff',
                        borderRadius: '12px',
                        padding: '10px 8px',
                        minHeight: '78px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        color: '#881337',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '1.12rem' }}>{module.icon}</span>
                      <span style={{ fontSize: '0.69rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {attachmentPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? '12px' : '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '14px', border: '1px solid #fecdd3', boxShadow: '0 24px 40px rgba(15, 23, 42, 0.35)', overflow: 'hidden' }}>
            <div style={{ padding: isMobile ? '12px 14px' : '14px 16px', background: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.08rem' }}>📎 Attachment</h3>
              <button onClick={() => setAttachmentPreview(null)} style={{ border: 'none', background: '#fff', color: '#be123c', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 700, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: isMobile ? '14px' : '16px' }}>
              <p style={{ margin: '0 0 10px', color: '#9f1239', fontWeight: 700 }}>{attachmentPreview.title}</p>
              <div style={{ border: '1px solid #fecdd3', borderRadius: '10px', overflow: 'hidden' }}>
                {attachmentPreview.attachments.map((fileName, index) => (
                  <div key={`${fileName}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderBottom: index === attachmentPreview.attachments.length - 1 ? 'none' : '1px solid #ffe4e6' }}>
                    <span style={{ color: '#334155', fontSize: isMobile ? '0.82rem' : '0.9rem', wordBreak: 'break-all' }}>{fileName}</span>
                    <button onClick={() => alert(`Downloading ${fileName}`)} style={{ border: '1px solid #fb7185', background: '#fff1f2', color: '#9f1239', borderRadius: '999px', padding: '5px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Download</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {receiptPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '12px' : '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: '#fff', borderRadius: '14px', border: '1px solid #dbeafe', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)', overflow: 'hidden' }}>
            <div style={{ padding: isMobile ? '14px' : '18px', background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', borderBottom: '1px solid #bfdbfe' }}>
              <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: isMobile ? '1.05rem' : '1.15rem', fontWeight: 700 }}>🧾 {receiptPreview.title}</h3>
              <p style={{ margin: '8px 0 0', color: '#1e40af', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{receiptPreview.description}</p>
            </div>
            <div style={{ padding: isMobile ? '14px' : '18px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                <p style={{ margin: 0, color: '#334155', fontSize: isMobile ? '0.82rem' : '0.9rem' }}><strong>File:</strong> {receiptPreview.fileName}</p>
                <p style={{ margin: '6px 0 0', color: '#334155', fontSize: isMobile ? '0.82rem' : '0.9rem' }}><strong>Total Receipts:</strong> {receiptPreview.entries.length}</p>
              </div>
              <div style={{ maxHeight: isMobile ? '170px' : '210px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                {receiptPreview.entries.map((entry, index) => (
                  <div key={`${entry.student.id}-${entry.instalment.id}-${index}`} style={{ padding: '10px 12px', borderBottom: index === receiptPreview.entries.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1f2937', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{entry.student.name} ({entry.student.rollNo})</p>
                    <p style={{ margin: '4px 0 0', color: '#475569', fontSize: isMobile ? '0.78rem' : '0.84rem' }}>{entry.instalment.id} • {formatCurrency(entry.instalment.amount)} • Paid on {entry.instalment.paidOn}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button onClick={closeReceiptPreview} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer', minHeight: '40px' }}>Cancel</button>
                <button onClick={confirmReceiptDownload} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #0f766e', background: '#ccfbf1', color: '#115e59', fontWeight: 700, cursor: 'pointer', minHeight: '40px' }}>Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Parents;