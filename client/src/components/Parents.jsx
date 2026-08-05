import React, { useEffect, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';
import { api } from '../api';
import ParentStudentProfile from './ParentStudentProfile';
import MyDocuments from './MyDocuments';
import { formatDateIST, formatDateTimeIST, formatDateDMY, formatDateTimeDMY } from '../utils/formatDate';

// currentStudent.grade is a display string ("Grade 3"); the timetable/notes
// APIs need the bare numeric grade.
const gradeNumber = (label) => Number(String(label).replace(/\D/g, ''));

const Parents = () => {
  const deepLinkNoticeId = new URLSearchParams(window.location.search).get('noticeId');
  const deepLinkAttendanceDate = new URLSearchParams(window.location.search).get('date');
  const [activeModule, setActiveModule] = useState(
    () => new URLSearchParams(window.location.search).get('module') || 'profile'
  );
  const [selectedChildId, setSelectedChildId] = useState(null);
  const today = new Date();
  const [selectedActivityDate, setSelectedActivityDate] = useState(today);
  const [selectedTimetableDate, setSelectedTimetableDate] = useState(today);
  const [activityMonth, setActivityMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [timetableMonth, setTimetableMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [timetableEntries, setTimetableEntries] = useState([]);

  // Switching to the Timetable Quick Access card always jumps back to
  // today's date, even if the parent had previously navigated elsewhere in
  // it and left it there — not just on first page load.
  const openModule = (key) => {
    if (key === 'timetable') {
      const now = new Date();
      setSelectedTimetableDate(now);
      setTimetableMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setActiveModule(key);
  };
  const [activityView, setActivityView] = useState('classwork');
  // Opens straight to today's timetable instance rather than the month grid,
  // so the parent lands on current data instead of navigating there each time.
  const [activityDrillLevel, setActivityDrillLevel] = useState('day'); // 'month' -> 'week' -> 'day' (a timetable instance)
  const [activitySearch, setActivitySearch] = useState('');
  const [circularSearch, setCircularSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (deepLinkAttendanceDate) {
      const d = new Date(deepLinkAttendanceDate);
      if (!Number.isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [attachmentMap, setAttachmentMap] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ category: 'Casual', fromDate: '', toDate: '', reason: '', teacherNote: '', document: null, docName: '' });
  const [leaveFormErrors, setLeaveFormErrors] = useState({});
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [selectedDateDetail, setSelectedDateDetail] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 'LR-001', type: 'advance', fromDate: '2026-04-09', toDate: '2026-04-09', reason: 'Family function', status: 'Approved', submittedAt: '2026-04-07 09:15 AM', approvedBy: 'Ms. Rekha Iyer', approvedAt: '2026-04-07 02:30 PM' },
    { id: 'LR-002', type: 'advance', fromDate: '2026-04-03', toDate: '2026-04-03', reason: 'Medical leave', status: 'Approved', submittedAt: '2026-04-01 11:00 AM', approvedBy: 'Ms. Rekha Iyer', approvedAt: '2026-04-01 04:15 PM' },
    { id: 'LR-003', type: 'regularization', fromDate: '2026-04-06', toDate: '2026-04-06', reason: 'Fever — medical certificate attached', status: 'Pending', submittedAt: '2026-04-08 08:45 AM', approvedBy: null, approvedAt: null },
  ]);
  const [notifications, setNotifications] = useState([]);
  const [apiNotices, setApiNotices] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [serverNotifications, setServerNotifications] = useState({ unreadCount: 0, notifications: [] });
  // 'unsupported' | 'off' | 'on' | 'busy' — push notification opt-in state.
  const [pushStatus, setPushStatus] = useState(
    ('serviceWorker' in navigator && 'PushManager' in window) ? 'off' : 'unsupported'
  );

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // A push subscription lives at the browser/device level (tied to the
  // service worker's origin), not to whichever account happens to be
  // logged in — on a shared device, a previous parent's login could have
  // created it. Re-POSTing it here on every load re-associates it with
  // whoever is actually logged in *now* (the subscribe endpoint upserts by
  // endpoint, so this just updates ownership, no duplicate rows), instead
  // of silently leaving it bound to whoever subscribed first.
  useEffect(() => {
    if (pushStatus === 'unsupported') return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) {
          setPushStatus('off');
          // Enabled by default: auto-subscribe on load instead of waiting for
          // a manual click, unless the parent has already explicitly denied
          // the browser permission (in which case re-prompting is pointless
          // and some browsers block it outright).
          if (Notification.permission !== 'denied') enablePushNotifications();
          return;
        }
        api.post('/api/push/subscribe', sub.toJSON()).catch(() => {});
        setPushStatus('on');
      })
      .catch(() => {});
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  const enablePushNotifications = async () => {
    setPushStatus('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus('off'); return; }

      const { publicKey } = await api.get('/api/push/vapid-public-key');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/api/push/subscribe', subscription.toJSON());
      setPushStatus('on');
    } catch (err) {
      pushNotification(err.message || 'Could not enable notifications.', 'error');
      setPushStatus('off');
    }
  };

  const disablePushNotifications = async () => {
    setPushStatus('busy');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/api/push/subscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setPushStatus('off');
    } catch (err) {
      pushNotification(err.message || 'Could not disable notifications.', 'error');
      setPushStatus('on');
    }
  };

  // Fetch this parent's own audience-resolved notices (broad + anything
  // scoped to their specific child's grade/house/division/id) for the
  // circular/message tabs.
  useEffect(() => {
    api.get('/api/notices/mine')
      .then((data) => setApiNotices(data.notices || []))
      .catch(() => {});
  }, []);

  // Deep link from a push notification (?module=circular&noticeId=123) —
  // scroll to the specific notice, like landing on a row in an email inbox.
  // Deliberately left collapsed: the "Opened" count on the admin side is
  // only meant to increment when a parent actually taps to open a notice
  // (toggleCircularAccordion's read POST below), so auto-expanding here
  // would silently under-count reads for anything opened via a notification.
  useEffect(() => {
    if (!deepLinkNoticeId || !apiNotices.length) return;
    const notice = apiNotices.find((n) => String(n._id) === deepLinkNoticeId);
    if (!notice) return;
    const cardId = `circular-${notice._id}`;
    document.getElementById(cardId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [apiNotices, deepLinkNoticeId]);

  // In-app notifications (e.g. "attendance locked for today") — no email/push
  // infra exists yet, so this is what the parent sees on next portal visit.
  useEffect(() => {
    api.get('/api/notifications')
      .then((data) => setServerNotifications(data))
      .catch(() => {});
  }, []);

  // Load leave requests from API for current student
  useEffect(() => {
    if (!selectedChildId) return;
    api.get('/api/attendance/leave-requests', { studentId: selectedChildId })
      .then((data) => {
        const remote = data.leaveRequests || [];
        if (remote.length > 0) setLeaveRequests(remote);
      })
      .catch(() => {});
  }, [selectedChildId]);

  // Load real attendance records for the calendar's currently displayed month.
  useEffect(() => {
    if (!selectedChildId) return;
    api.get(`/api/attendance/student/${selectedChildId}`, { year: currentMonth.getFullYear(), month: currentMonth.getMonth() + 1 })
      .then((data) => setAttendanceData(data.days || []))
      .catch(() => setAttendanceData([]));
  }, [selectedChildId, currentMonth]);

  // Deep link from an attendance-marked push notification (?module=attendance
  // &date=2026-08-04) — open that day's detail the moment its month finishes
  // loading, instead of leaving the parent to find it on the calendar.
  useEffect(() => {
    if (!deepLinkAttendanceDate || !attendanceData.length) return;
    const day = attendanceData.find((d) => d.date === deepLinkAttendanceDate);
    // The detail modal is only meaningful for non-present days (present days
    // have nothing to regularize/explain) — a Present notification still
    // lands on the right month, just without forcing an empty modal open.
    if (day && day.status !== 'present') setSelectedDateDetail(day);
  }, [attendanceData, deepLinkAttendanceDate]);

  // Full student record (beyond the curated linkedStudents display fields)
  // just to power the Student Profile card's "incomplete" badge.
  const [studentProfileData, setStudentProfileData] = useState(null);
  useEffect(() => {
    if (!selectedChildId) return;
    api.get(`/api/students/${selectedChildId}`)
      .then(setStudentProfileData)
      .catch(() => setStudentProfileData(null));
  }, [selectedChildId]);

  // Recent teaching-update notes (classwork/homework), Communication-style —
  // fetched independently of the month/week/day drill-down below so the
  // Quick Access badge and preview list both work without navigating there.
  const [periodNoteUpdates, setPeriodNoteUpdates] = useState([]);
  useEffect(() => {
    if (!selectedChildId) return;
    api.get('/api/period-notes/mine', { studentId: selectedChildId })
      .then((data) => setPeriodNoteUpdates(data.notes || []))
      .catch(() => setPeriodNoteUpdates([]));
  }, [selectedChildId]);

  // isOpen is the caller's effective state (accounts for the isRead
  // fallback) — see toggleCircularAccordion below for why toggling off that,
  // rather than the raw stored expandedCards value, matters.
  const openPeriodNoteUpdate = (note, cardId, isOpen) => {
    if (!isOpen) {
      api.post(`/api/period-notes/${note.id}/read`).catch(() => {});
      setPeriodNoteUpdates((prev) => prev.map((n) => (n.id === note.id ? { ...n, isRead: true } : n)));
    }
    setExpandedCards((previous) => ({ ...previous, [cardId]: !isOpen }));
  };

  useEffect(() => {
    let isCancelled = false;

    const loadAttachments = async () => {
      try {
        const token = window.localStorage.getItem('smt-school-token');
        if (!token) {
          return;
        }

        const response = await fetch(`${apiBase}/api/attachments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (isCancelled || !data || !Array.isArray(data.attachments)) {
          return;
        }

        const map = data.attachments.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});

        setAttachmentMap(map);
      } catch (error) {
        // Keep UI functional even if attachment API is temporarily unavailable.
      }
    };

    loadAttachments();
    return () => {
      isCancelled = true;
    };
  }, [apiBase]);

  const [linkedStudents, setLinkedStudents] = useState([]);
  const [linkedStudentsLoaded, setLinkedStudentsLoaded] = useState(false);

  // Resolve the logged-in parent's real linked children (guardians.user_id ->
  // student_guardians -> students). A login with no real linked children (the
  // shared demo `parent` account, or a real account missing its guardian
  // link) gets an honest empty state throughout the portal — see
  // PLACEHOLDER_STUDENT below — rather than the fictional "Kulkarni family"
  // fixture this used to fall back to. That fixture caused two problems: it
  // briefly flashed on every real parent's page load/refresh before the real
  // fetch overwrote it, and it made the demo login look inconsistent — the
  // header/Quick Access showed a fake-but-real-looking student while the
  // Student Profile tab correctly refused to render a fake profile.
  //
  // Note: fee details below (feeDetailsByStudent) are still keyed off the old
  // demo student IDs (S-7A-15 etc.) and not wired to real linked children at
  // all — harmless for now since Fees is gated under Upcoming Features
  // (unreachable), but worth fixing properly if Fees is ever un-gated.
  useEffect(() => {
    api.get('/api/auth/me/children')
      .then((data) => {
        const children = data.children || [];
        if (!children.length) {
          setLinkedStudents([]);
          setLinkedStudentsLoaded(true);
          return;
        }
        const mapped = children.map((s) => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`.trim(),
          grade: `Grade ${s.grade}`,
          division: s.division ? s.division.charAt(0).toUpperCase() + s.division.slice(1) : '',
          rollNo: `${s.grade}${s.division ? s.division[0].toUpperCase() : ''}-${String(s.rollNo).padStart(2, '0')}`,
          dob: s.dob ? new Date(s.dob).toISOString().slice(0, 10) : '-',
          address: s.address || '-',
          phone: s.parentMobile || '-',
          email: s.parentEmail || '-',
          bloodGroup: s.bloodGroup || '-',
          emergencyContact: s.parentName || '-',
          relation: s.myRelation || '-',
          house: s.houseName || '-',
          photo: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(s.firstName + '-' + s.lastName)}`,
          admissionDate: s.admissionYear ? `${s.admissionYear}-06-01` : '-',
        }));
        setLinkedStudents(mapped);
        setSelectedChildId(mapped[0].id);
        setLinkedStudentsLoaded(true);
      })
      .catch(() => {
        setLinkedStudents([]);
        setLinkedStudentsLoaded(true);
      });
  }, []);

  // Safe, non-identifying stand-in — used both for the brief window before
  // the real /children fetch resolves, and permanently once we know for
  // certain this login has no linked student. Never another child's actual
  // name/details, and never the fictional Kulkarni family either.
  const PLACEHOLDER_STUDENT = {
    id: '', name: linkedStudentsLoaded ? 'No student linked' : 'Loading…', grade: '', division: '', rollNo: '', dob: '-',
    address: '-', phone: '-', email: '-', bloodGroup: '-', emergencyContact: '-',
    relation: '-', house: '-', photo: '', admissionDate: '-',
  };
  const currentStudent = linkedStudents.find((child) => child.id === selectedChildId) || linkedStudents[0] || PLACEHOLDER_STUDENT;

  // Real classwork/homework for the selected date, replacing the old hardcoded
  // mock: joins the weekly timetable template (subject/teacher per period) with
  // that specific date's period-notes overlay, keeping only periods a teacher
  // actually filled in.
  useEffect(() => {
    if (!currentStudent) { setDailyActivities([]); return; }
    const dateKey = `${selectedActivityDate.getFullYear()}-${String(selectedActivityDate.getMonth() + 1).padStart(2, '0')}-${String(selectedActivityDate.getDate()).padStart(2, '0')}`;
    const jsDay = selectedActivityDate.getDay();
    if (jsDay === 0) { setDailyActivities([]); return; }

    Promise.all([
      api.get('/api/timetable', { grade: gradeNumber(currentStudent.grade), division: currentStudent.division, day: jsDay }),
      api.get('/api/period-notes', { grade: gradeNumber(currentStudent.grade), division: currentStudent.division, date: dateKey }),
    ])
      .then(([timetableData, notesData]) => {
        const periods = timetableData.periods || [];
        const notes = (notesData.notes || []).filter((n) => n.classwork || n.homework);
        setDailyActivities(notes.map((n) => {
          const p = periods.find((per) => per.periodIndex === n.periodIndex) || {};
          return {
            date: dateKey,
            period: `Period ${n.periodIndex} - ${p.subject || ''}`,
            classwork: n.classwork || '',
            homework: n.homework || '',
            teacher: p.teacherName || '',
            attachments: (n.attachments || []).map((a) => a.fileUrl),
          };
        }));
      })
      .catch(() => setDailyActivities([]));
  }, [currentStudent, selectedActivityDate]);

  // Static weekly schedule for the student's own grade+division — the same
  // periods recur every week for that class, keyed by day-of-week rather than
  // a specific calendar date (there's no per-date row to match against).
  useEffect(() => {
    if (!currentStudent) { setTimetableEntries([]); return; }
    const jsDay = selectedTimetableDate.getDay();
    if (jsDay === 0) { setTimetableEntries([]); return; }

    api.get('/api/timetable', { grade: gradeNumber(currentStudent.grade), division: currentStudent.division, day: jsDay })
      .then((data) => {
        const periods = data.periods || [];
        setTimetableEntries(periods.map((p) => ({
          period: p.type && p.type !== 'Period' ? p.type : `Period ${p.periodIndex}`,
          subject: p.subject || '',
          time: p.time || '',
          teacher: p.teacherName || '',
          details: p.room ? `Room: ${p.room}` : '',
          attachments: [],
        })));
      })
      .catch(() => setTimetableEntries([]));
  }, [currentStudent, selectedTimetableDate]);

  // Get last 10 days of attendance within the currently loaded month
  const last10DaysAttendance = useMemo(() => {
    return attendanceData.slice(-10);
  }, [attendanceData]);

  const adminNotes = useMemo(() => [
    { id: 1, author: 'Ms. Smita Naik', role: 'Principal', text: 'Repeated absenteeism observed. Please ensure regular attendance to avoid impact on academics and term completion.', timestamp: '14-APR-2026, 10:30 AM', priority: 'high' },
    { id: 2, author: 'Ms. Rekha Iyer', role: 'Class Teacher', text: 'Please visit school and meet the class teacher to discuss recent absence pattern. Next PTM is 20 April.', timestamp: '10-APR-2026, 02:15 PM', priority: 'medium' },
  ], []);

  const pushNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4500);
  };

  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-03-15', type: 'past', photos: ['sports1.jpg', 'sports2.jpg'], takeaways: 'Great participation, Aarav won 100m race silver medal', details: 'Held at school ground, 200 students participated' },
    { id: 2, title: 'PTM Meeting', date: '2026-04-20', type: 'upcoming', preparation: 'Prepare progress report discussion, bring any concerns', details: 'Meeting with class teacher and subject teachers' },
    { id: 3, title: 'Science Exhibition', date: '2026-05-10', type: 'upcoming', preparation: 'Help child prepare project on renewable energy', details: 'Inter-school competition, theme: Future of Energy' },
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
      `Payment Date: ${instalment.paidOn ? formatDateDMY(instalment.paidOn) : 'N/A'}`,
      `Payment Mode: ${instalment.mode || 'N/A'}`,
      `Installment Due Date: ${formatDateDMY(instalment.dueDate)}`,
      `Generated On: ${formatDateTimeDMY(new Date())}`,
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
    doc.text('School Seal: Digitally generated by VidyaSetu', 17, y + 8);
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
    if (status === 'present') return '#10b981';          // green
    if (status === 'holiday') return '#6b7280';           // grey
    if (type === 'approved-leave') return '#f59e0b';      // amber — approved leave
    if (type === 'leave-applied') return '#3b82f6';       // blue — pending application
    if (type === 'unregularized') return '#ef4444';       // red — unregularized absence
    if (status === 'absent') return '#ef4444';            // fallback absent
    return '#fff';
  };

  const getStatusLabel = (status, type) => {
    if (status === 'present') return '✓ Present';
    if (status === 'holiday') return '● Public Holiday';
    if (type === 'approved-leave') return '✓ Approved Leave';
    if (type === 'leave-applied') return '⏳ Leave Applied';
    if (type === 'unregularized') return '⚠ Unregularized';
    return '✕ Absent';
  };

  // 2nd/4th Saturdays and all Sundays are non-working days school-wide.
  const isNonWorkingDay = (date) => {
    const day = date.getDay();
    if (day === 0) return true;
    if (day === 6) {
      const occurrence = Math.floor((date.getDate() - 1) / 7) + 1;
      return occurrence === 2 || occurrence === 4;
    }
    return false;
  };

  // Calendar cell color: future/unmarked days stay blank (nothing to show
  // yet), weekly-offs and public holidays get their own colors regardless of
  // attendance data, and only past working days are colored by attendance.
  const getDayColor = (date, att) => {
    if (att && att.status === 'holiday') return '#14b8a6';
    if (isNonWorkingDay(date)) return '#a78bfa';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date); cellDate.setHours(0, 0, 0, 0);
    if (cellDate > today || !att) return '#ffffff';
    if (att.status === 'present') return '#10b981';
    if (att.type === 'unregularized') return '#ef4444';
    if (att.type === 'approved-leave' || att.type === 'leave-applied') return '#f97316';
    return '#ffffff';
  };

  const getDayLabel = (date, att) => {
    if (att && att.status === 'holiday') return getStatusLabel(att.status, att.type);
    if (isNonWorkingDay(date)) return '● Non-working Day';
    if (!att) return '';
    return getStatusLabel(att.status, att.type);
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
    return attendanceData.find(a => a.date === dateStr);
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

  // Month grid for the Teaching Updates drill-down: one cell per day, null for
  // the leading blanks before day 1 so the grid aligns under Sun..Sat headers.
  const buildMonthGrid = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = new Date(year, month, 1).getDay();
    const cells = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  };

  const activityMonthGrid = buildMonthGrid(activityMonth);

  const changeActivityWeek = (delta) => {
    const nextDate = new Date(selectedActivityDate);
    nextDate.setDate(selectedActivityDate.getDate() + delta * 7);
    setSelectedActivityDate(nextDate);
    if (nextDate.getMonth() !== activityMonth.getMonth() || nextDate.getFullYear() !== activityMonth.getFullYear()) {
      setActivityMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
  };

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

  const selectedTimetableEntries = timetableEntries;

  // Merge static circulars with API notices for the circular tab. Nothing
  // is filtered out here — deactivated and expired notices stay visible
  // (flagged via isArchived) rather than disappearing; only actual deletion
  // by the creator removes a notice from this feed, matching the same
  // policy the admin Communication screen already uses for its own
  // Active/Archived split (both tabs are visible there too, just labeled).
  const mergedCircularNotices = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const apiMapped = apiNotices
      .map((n) => ({
        id: n._id,
        date: n.publishedAt ? new Date(n.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        eventDate: n.eventDate || null,
        title: n.title,
        body: n.body,
        issuedBy: n.issuedBy || '',
        attachments: (n.attachments || []).map((d) => d.fileUrl),
        isRead: !!n.isRead,
        isArchived: !n.isActive || (n.expiresAt && n.expiresAt.slice(0, 10) < todayStr),
      }));
    return apiMapped.length > 0 ? apiMapped : circularNotices;
  }, [apiNotices, circularNotices]);

  const filteredCircularNotices = mergedCircularNotices.filter((notice) => {
    const query = circularSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return `${notice.title} ${notice.body} ${notice.date}`.toLowerCase().includes(query);
  });

  // Real uploads (period-note/notice attachments) are served directly as
  // static files at /uploads/... — only the handful of hardcoded demo
  // filenames (no leading slash) go through the mock /api/attachments/:id
  // route. Mixing the two up sends real file paths to that mock lookup,
  // which 404s with "Attachment not found".
  const openAttachmentPreview = (title, attachments) => {
    if (!attachments || !attachments.length) {
      return;
    }

    const resolvedAttachments = attachments.map((attachmentId) => {
      if (attachmentMap[attachmentId]) {
        return attachmentMap[attachmentId];
      }

      if (attachmentId.startsWith('/uploads/')) {
        const fileName = attachmentId.split('/').pop();
        const url = `${apiBase}${attachmentId}`;
        return { id: attachmentId, fileName, title: fileName, previewUrl: url, downloadUrl: url };
      }

      const encodedId = encodeURIComponent(attachmentId);
      return {
        id: attachmentId,
        fileName: attachmentId,
        title: attachmentId,
        previewUrl: `${apiBase}/api/attachments/${encodedId}/preview`,
        downloadUrl: `${apiBase}/api/attachments/${encodedId}/download`,
      };
    });

    setAttachmentPreview({ title, attachments: resolvedAttachments });
  };

  const toggleAccordion = (cardId) => {
    setExpandedCards((previous) => ({
      ...previous,
      [cardId]: !previous[cardId],
    }));
  };

  // Records a read event the moment a circular is actually opened (not just
  // listed) — feeds the admin-facing Reached/Opened comparison on the
  // Communication screen. Guarded on notice.id since the static fallback
  // circulars (shown only if the API has none) aren't real notices.
  // isOpen is the caller's already-computed *effective* state (which, unlike
  // a raw expandedCards[cardId] lookup, accounts for the isRead fallback for
  // cards never toggled this session) — toggling off that rather than
  // blindly flipping the raw stored value, which would no-op when the two
  // disagreed (e.g. clicking Close on an already-read, isRead-defaulted-open
  // card wouldn't actually close it).
  const toggleCircularAccordion = (notice, cardId, isOpen) => {
    if (!isOpen && notice.id) {
      api.post(`/api/notices/${notice.id}/read`).catch(() => {});
    }
    setExpandedCards((previous) => ({ ...previous, [cardId]: !isOpen }));
  };

  const isAccordionOpen = (cardId, index) => {
    if (expandedCards[cardId] === undefined) {
      return index === 0;
    }
    return expandedCards[cardId];
  };

  // Parent's own profile lives inside Student Profile's "Guardians" tab
  // (ParentStudentProfile.jsx) with real, editable data — no separate tile.
  const workingModules = [
    { key: 'profile', label: 'Student Profile', icon: '👤' },
    { key: 'attendance', label: 'Attendance', icon: '📅' },
    { key: 'timetable', label: 'Timetable', icon: '⏰' },
    { key: 'activities', label: 'Teaching Updates', icon: '📚' },
    { key: 'circular', label: 'Communication', icon: '📢' },
    { key: 'contact', label: 'Important Contacts', icon: '📞' },
    { key: 'documents', label: 'My Documents', icon: '📁' },
  ];

  // Small "you haven't seen this yet" counts shown as a badge on each Quick
  // Access card. Profile completeness is judged against a small, deliberately
  // non-exhaustive set of commonly-missed fields — not every optional column.
  const PROFILE_COMPLETENESS_FIELDS = ['dob', 'address', 'bloodGroup', 'medicalNotes', 'photoUrl'];
  const profileIncompleteCount = studentProfileData
    ? PROFILE_COMPLETENESS_FIELDS.filter((f) => !studentProfileData[f]).length + ((studentProfileData.guardians || []).length === 0 ? 1 : 0)
    : 0;
  const attendancePendingRegularizationCount = attendanceData.filter((d) => d.type === 'unregularized').length;
  const circularUnreadCount = mergedCircularNotices.filter((n) => !n.isArchived && !n.isRead).length;

  const moduleBadgeCounts = {
    profile: profileIncompleteCount,
    attendance: attendancePendingRegularizationCount,
    circular: circularUnreadCount,
    activities: periodNoteUpdates.filter((n) => !n.isRead).length,
  };

  const upcomingModules = [
    { key: 'fees', label: 'Fees', icon: '💳' },
    { key: 'events', label: 'Events', icon: '🎉' },
    { key: 'gallery', label: 'Photo Gallery', icon: '🖼️' },
    { key: 'report', label: 'Report Card', icon: '📑' },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'profile':
        return /^\d+$/.test(String(currentStudent.id))
          ? <ParentStudentProfile studentId={currentStudent.id} isMobile={isMobile} />
          : (
            <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)', border: '2px solid #0ea5e9' }}>
              <p style={{ color: '#0369a1' }}>This demo login isn't linked to a real student record, so the full profile can't be shown. Log in as a real parent account to see it.</p>
            </div>
          );
      case 'attendance': {
        const priorityBadge = { high: { bg: '#fee2e2', color: '#dc2626', label: 'High' }, medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium' }, low: { bg: '#f0fdf4', color: '#16a34a', label: 'Low' } };
        const statusBadge = { Pending: { bg: '#fef3c7', color: '#d97706' }, Approved: { bg: '#dcfce7', color: '#166534' }, Rejected: { bg: '#fee2e2', color: '#dc2626' }, Regularized: { bg: '#dbeafe', color: '#1d4ed8' } };

        const submitLeave = () => {
          const errors = {};
          if (!leaveForm.fromDate) errors.fromDate = 'From date is required.';
          if (!leaveForm.toDate) errors.toDate = 'To date is required.';
          if (leaveForm.toDate && leaveForm.fromDate && leaveForm.toDate < leaveForm.fromDate) errors.toDate = 'To date cannot be before from date.';
          if (!leaveForm.reason.trim()) errors.reason = 'Reason is required.';
          if (Object.keys(errors).length > 0) { setLeaveFormErrors(errors); return; }
          const todayStr = new Date().toISOString().slice(0, 10);
          const isAdvance = leaveForm.fromDate >= todayStr;
          const successMsg = isAdvance ? 'Leave application submitted. Awaiting teacher approval.' : 'Regularization request submitted.';
          setLeaveSubmitting(true);
          api.post('/api/attendance/leave-requests', {
            studentId: selectedChildId,
            category: leaveForm.category,
            fromDate: leaveForm.fromDate,
            toDate: leaveForm.toDate,
            reason: leaveForm.reason,
          })
            .then((newReq) => {
              setLeaveRequests((prev) => [...prev, newReq]);
              setLeaveSubmitting(false);
              setShowLeaveModal(false);
              if (leaveForm.document) {
                const formData = new FormData();
                formData.append('category', 'leave-requests');
                formData.append('ownerType', 'leave_request');
                formData.append('ownerId', newReq.id);
                formData.append('file', leaveForm.document);
                const token = window.localStorage.getItem('smt-school-token');
                fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
                  .then((res) => { if (!res.ok) pushNotification('Leave submitted, but the document failed to attach.', 'error'); })
                  .catch(() => pushNotification('Leave submitted, but the document failed to attach.', 'error'));
              }
              setLeaveForm({ category: 'Casual', fromDate: '', toDate: '', reason: '', teacherNote: '', document: null, docName: '' });
              setLeaveFormErrors({});
              pushNotification(successMsg);
            })
            .catch((err) => {
              // A rejected submission (e.g. the server refusing an
              // application for an already-locked, non-absent day) must
              // surface as an actual error — silently faking success here
              // previously meant the parent saw "submitted" and the modal
              // closed even though nothing was actually saved.
              setLeaveSubmitting(false);
              pushNotification(err.message || 'Could not submit — please try again.', 'error');
            });
        };

        const fieldStyle = { width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' };
        const errStyle = { color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' };

        return (
          <div style={{ padding: isMobile ? '14px' : '22px', borderRadius: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)', border: '2px solid #22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ color: '#166534', fontSize: isMobile ? '1.15rem' : '1.35rem', fontWeight: '700', margin: 0 }}>📅 Attendance Calendar & History</h3>
              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  setLeaveForm((f) => ({ ...f, fromDate: todayStr, toDate: todayStr, teacherNote: '' }));
                  setShowLeaveModal(true);
                }}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 3px 10px rgba(22,163,74,0.3)' }}
              >
                + Apply Leave
              </button>
            </div>

            {/* Calendar */}
            <div style={{ marginBottom: '20px', background: '#fff', padding: isMobile ? '12px' : '18px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ padding: '6px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>← Prev</button>
                <h4 style={{ margin: 0, color: '#166534', fontWeight: 700 }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</h4>
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ padding: '6px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Next →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontWeight: 700, color: '#166534', padding: '6px', fontSize: '0.82rem' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {calendarDays.map((date, index) => {
                  const att = date ? getAttendanceForDate(date) : null;
                  const bg = !date ? '#f3f4f6' : getDayColor(date, att);
                  const isBlank = bg === '#ffffff';
                  const isToday = date && new Date().toDateString() === date.toDateString();
                  const clickable = date && att && att.status !== 'present';
                  return (
                    <div
                      key={index}
                      onClick={() => { if (clickable) setSelectedDateDetail(att); }}
                      title={date ? getDayLabel(date, att) : ''}
                      style={{ backgroundColor: bg, padding: isMobile ? '5px 2px' : '9px 3px', border: isToday ? '3px solid #22c55e' : isBlank ? '1px solid #e2e8f0' : '1px solid #dcfce7', borderRadius: '4px', textAlign: 'center', color: !date ? '#d1d5db' : isBlank ? '#334155' : '#fff', minHeight: isMobile ? '30px' : '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: date ? 700 : 400, cursor: clickable ? 'pointer' : 'default', fontSize: isMobile ? '0.78rem' : '0.88rem', transition: 'opacity 150ms' }}
                    >
                      {date ? date.getDate() : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
              <h4 style={{ color: '#166534', fontWeight: 700, marginBottom: '8px', margin: '0 0 8px' }}>Legend</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[['#10b981', '✓ Present', '#fff'], ['#f97316', '✕ Absent (leave)', '#fff'], ['#ef4444', '⚠ Unregularized', '#fff'], ['#a78bfa', '● Non-working Day', '#fff'], ['#14b8a6', '★ Public Holiday', '#fff'], ['#ffffff', '○ Not Marked / Upcoming', '#334155']].map(([color, label, text]) => (
                  <span key={label} style={{ background: color, color: text, border: color === '#ffffff' ? '1px solid #cbd5e1' : 'none', padding: '3px 9px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>{label}</span>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.76rem' }}>Tap any non-present date to see details or apply regularization.</p>
            </div>

            {/* Admin / Principal Notes */}
            {adminNotes.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fecdd3', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#fef2f2', borderBottom: '1px solid #fecdd3' }}>
                  <h4 style={{ margin: 0, color: '#9f1239', fontWeight: 800, fontSize: '0.95rem' }}>🔔 Notes from School Administration</h4>
                </div>
                {adminNotes.map((note) => {
                  const pb = priorityBadge[note.priority];
                  return (
                    <div key={note.id} style={{ padding: '12px 14px', borderBottom: '1px solid #fef2f2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.5 }}>{note.text}</p>
                          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.76rem' }}>{note.author} · {note.role} · {note.timestamp}</p>
                        </div>
                        <span style={{ padding: '3px 9px', borderRadius: '999px', background: pb.bg, color: pb.color, fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{pb.label} Priority</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leave Requests */}
            {leaveRequests.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                  <h4 style={{ margin: 0, color: '#166534', fontWeight: 800, fontSize: '0.95rem' }}>📋 My Leave Applications</h4>
                </div>
                {leaveRequests.map((req) => {
                  const sb = statusBadge[req.status];
                  return (
                    <div key={req.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f0fdf4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{req.type === 'advance' ? 'Advance Leave' : 'Regularization'}</span>
                            {req.category && <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>{req.category}</span>}
                            <span style={{ padding: '2px 8px', borderRadius: '999px', background: sb.bg, color: sb.color, fontWeight: 700, fontSize: '0.72rem' }}>{req.status}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.82rem' }}>{req.fromDate === req.toDate ? formatDateDMY(req.fromDate) : `${formatDateDMY(req.fromDate)} → ${formatDateDMY(req.toDate)}`} · {req.reason}</p>
                          <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '0.74rem' }}>Submitted: {formatDateTimeDMY(req.submittedAt)}{req.approvedBy ? ` · Approved by: ${req.approvedBy} at ${formatDateTimeDMY(req.approvedAt)}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Last 10 Days History */}
            <div>
              <h4 style={{ color: '#166534', fontWeight: 700, marginBottom: '10px' }}>📊 Last 10 Days History</h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {last10DaysAttendance.map((day) => {
                  const bg = getStatusColor(day.status, day.type);
                  const label = getStatusLabel(day.status, day.type);
                  const clickable = day.status !== 'present';
                  return (
                    <div
                      key={day.date}
                      onClick={() => { if (clickable) setSelectedDateDetail(day); }}
                      style={{ padding: '11px 14px', background: '#fff', borderRadius: '8px', border: `2px solid ${bg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', cursor: clickable ? 'pointer' : 'default', boxShadow: `0 2px 8px ${bg}18` }}
                    >
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <strong style={{ color: '#166534', fontSize: isMobile ? '0.85rem' : '0.92rem' }}>{formatDateDMY(day.date)}</strong>
                        {day.reason && <p style={{ margin: '2px 0 0', color: '#666', fontSize: '0.78rem' }}>{day.reason}</p>}
                      </div>
                      <span style={{ background: bg, color: '#fff', padding: '5px 11px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Apply Leave Modal */}
            {showLeaveModal && (
              <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveModal(false); }}>
                <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', maxWidth: '460px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.3)', maxHeight: '92vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#166534', fontWeight: 800 }}>Apply Leave / Regularization</h3>
                    <button type="button" onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.88rem' }}>Type</label>
                    <div style={{ padding: '9px 12px', borderRadius: '9px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 700, fontSize: '0.82rem' }}>
                      {leaveForm.fromDate && leaveForm.fromDate < new Date().toISOString().slice(0, 10) ? 'Post-Facto Regularization' : 'Advance Leave'}
                      <span style={{ display: 'block', fontWeight: 500, color: '#4b5563', fontSize: '0.74rem', marginTop: '2px' }}>Determined automatically from the dates below.</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.88rem' }}>Leave Category</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[['Casual', 'Casual'], ['Medical', 'Medical']].map(([val, lbl]) => (
                        <button key={val} type="button" onClick={() => setLeaveForm((f) => ({ ...f, category: val }))} style={{ flex: 1, padding: '9px', borderRadius: '9px', border: `2px solid ${leaveForm.category === val ? '#16a34a' : '#cbd5e1'}`, background: leaveForm.category === val ? '#dcfce7' : '#fff', color: leaveForm.category === val ? '#166534' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px', fontSize: '0.88rem' }}>From Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="date" value={leaveForm.fromDate} onChange={(e) => { setLeaveForm((f) => ({ ...f, fromDate: e.target.value })); setLeaveFormErrors((err) => ({ ...err, fromDate: '' })); }} style={{ ...fieldStyle, borderColor: leaveFormErrors.fromDate ? '#dc2626' : '#cbd5e1' }} />
                      {leaveFormErrors.fromDate && <p style={errStyle}>{leaveFormErrors.fromDate}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px', fontSize: '0.88rem' }}>To Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="date" value={leaveForm.toDate} onChange={(e) => { setLeaveForm((f) => ({ ...f, toDate: e.target.value })); setLeaveFormErrors((err) => ({ ...err, toDate: '' })); }} style={{ ...fieldStyle, borderColor: leaveFormErrors.toDate ? '#dc2626' : '#cbd5e1' }} />
                      {leaveFormErrors.toDate && <p style={errStyle}>{leaveFormErrors.toDate}</p>}
                    </div>
                  </div>

                  {leaveForm.teacherNote && (
                    <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '9px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#334155', fontSize: '0.78rem' }}>Teacher's note (for reference only)</p>
                      <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.86rem' }}>{leaveForm.teacherNote}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px', fontSize: '0.88rem' }}>Your Reason / Justification <span style={{ color: '#dc2626' }}>*</span></label>
                    <textarea rows={3} value={leaveForm.reason} onChange={(e) => { setLeaveForm((f) => ({ ...f, reason: e.target.value })); setLeaveFormErrors((err) => ({ ...err, reason: '' })); }} placeholder="Describe reason in detail..." style={{ ...fieldStyle, resize: 'vertical', borderColor: leaveFormErrors.reason ? '#dc2626' : '#cbd5e1' }} />
                    {leaveFormErrors.reason && <p style={errStyle}>{leaveFormErrors.reason}</p>}
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px', fontSize: '0.88rem' }}>Supporting Document (optional)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', border: '1px dashed #cbd5e1', borderRadius: '9px', cursor: 'pointer', background: '#f8fafc' }}>
                      <span style={{ color: '#64748b', fontSize: '0.84rem' }}>{leaveForm.docName || '📎 Upload document (PDF / Image)'}</span>
                      <input type="file" accept=".pdf,image/*" onChange={(e) => { const f = e.target.files[0]; if (f) setLeaveForm((prev) => ({ ...prev, document: f, docName: f.name })); }} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <button type="button" onClick={submitLeave} disabled={leaveSubmitting} style={{ width: '100%', padding: '12px', borderRadius: '11px', border: 'none', background: leaveSubmitting ? '#94a3b8' : '#16a34a', color: '#fff', fontWeight: 800, cursor: leaveSubmitting ? 'default' : 'pointer', fontSize: '0.95rem' }}>
                    {leaveSubmitting ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}

            {/* Date Detail Modal */}
            {selectedDateDetail && (
              <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedDateDetail(null); }}>
                <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Absence Details</h3>
                    <button type="button" onClick={() => setSelectedDateDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{formatDateDMY(selectedDateDetail.date, { withWeekday: true })}</p>
                    <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.88rem' }}>{selectedDateDetail.reason || selectedDateDetail.type}</p>
                    <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 12px', borderRadius: '999px', background: getStatusColor(selectedDateDetail.status, selectedDateDetail.type), color: '#fff', fontWeight: 700, fontSize: '0.78rem' }}>{getStatusLabel(selectedDateDetail.status, selectedDateDetail.type)}</span>
                  </div>
                  {(selectedDateDetail.type === 'unregularized') && (
                    <button
                      type="button"
                      onClick={() => {
                        // The teacher's own note is shown as read-only context in the
                        // form (teacherNote), never pre-filled into the editable Reason
                        // field — that's the parent's own regularization response, not
                        // a place to silently inherit/overwrite the teacher's text.
                        setLeaveForm((f) => ({ ...f, fromDate: selectedDateDetail.date, toDate: selectedDateDetail.date, reason: '', teacherNote: selectedDateDetail.reason || '' }));
                        setSelectedDateDetail(null);
                        setShowLeaveModal(true);
                      }}
                      style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 800, cursor: 'pointer', marginBottom: '10px' }}
                    >
                      Apply Regularization for this Date
                    </button>
                  )}
                  {(selectedDateDetail.type === 'approved-leave' || selectedDateDetail.type === 'leave-applied') && (
                    <p style={{ margin: 0, color: '#166534', fontSize: '0.84rem', fontWeight: 600, textAlign: 'center' }}>
                      {selectedDateDetail.type === 'approved-leave' ? '✓ Leave has been approved by school.' : '⏳ Leave application is pending approval.'}
                    </p>
                  )}
                  <button type="button" onClick={() => setSelectedDateDetail(null)} style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'timetable':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #fbbf24', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ color: '#92400e', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '12px' }}>⏰ Timetable</h3>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fcd34d', padding: isMobile ? '10px' : '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <button onClick={() => changeMonthKeepingDay(timetableMonth, setTimetableMonth, selectedTimetableDate, setSelectedTimetableDate, -1)} style={{ border: 'none', background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>←</button>
                <h4 style={{ margin: 0, color: '#92400e', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>{timetableMonth.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</h4>
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
                      transition: 'all 180ms ease',
                      transform: isSameDate(date, selectedTimetableDate) ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>{formatDateIST(date, { weekday: 'short' })}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</div>
                  </button>
                ))}
              </div>
            </div>
            {selectedTimetableEntries.length ? selectedTimetableEntries.map((entry, index) => {
              const cardId = `timetable-${entry.period}-${entry.time}`;
              const isOpen = isAccordionOpen(cardId, index);

              return (
                <div key={cardId} style={{ marginBottom: '10px', background: '#fff', borderRadius: '12px', border: '1px solid #fcd34d', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleAccordion(cardId)}
                    style={{ width: '100%', border: 'none', background: '#fff', padding: isMobile ? '12px' : '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, color: '#92400e', fontWeight: 800, fontSize: isMobile ? '0.9rem' : '0.95rem' }}>{entry.period} • {entry.subject}</p>
                      <p style={{ margin: '5px 0 0', color: '#7c2d12', fontSize: isMobile ? '0.78rem' : '0.86rem' }}>{entry.time} • {entry.teacher}</p>
                    </div>
                    <span style={{ color: '#9a3412', fontWeight: 800, fontSize: '1rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}>⌃</span>
                  </button>
                  <div style={{ maxHeight: isOpen ? '220px' : '0px', opacity: isOpen ? 1 : 0, overflow: 'hidden', transition: 'max-height 240ms ease, opacity 220ms ease' }}>
                    <div style={{ padding: isMobile ? '0 12px 12px' : '0 14px 14px', borderTop: '1px solid #ffedd5' }}>
                      <p style={{ margin: '10px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{entry.details}</p>
                      {entry.attachments.length > 0 && (
                        <button onClick={() => openAttachmentPreview(`${entry.period} Attachment`, entry.attachments)} style={{ marginTop: '8px', border: '1px solid #f59e0b', background: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {entry.attachments.length} Attachment</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #fbbf24', color: '#92400e', fontWeight: 600 }}>No timetable set for this class on the selected day.</div>
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
      case 'activities': {
        const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const navButtonStyle = { border: 'none', background: '#6366f1', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 };
        const backLinkStyle = { border: 'none', background: 'none', color: '#4338ca', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: '10px', fontSize: isMobile ? '0.85rem' : '0.9rem' };

        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)', border: '2px solid #6366f1', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)' }}>
            <h3 style={{ color: '#3730a3', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📚 Teaching Updates</h3>

            {periodNoteUpdates.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c7d2fe', padding: isMobile ? '10px' : '14px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 10px', color: '#3730a3', fontSize: isMobile ? '0.95rem' : '1.02rem', fontWeight: 700 }}>Recent Updates</h4>
                {periodNoteUpdates.map((note) => {
                  const cardId = `periodnote-${note.id}`;
                  // Once actually read (this session or a previous one), stay
                  // expanded on future loads — expandedCards is local UI state
                  // that resets on refresh, but isRead is persisted server-side.
                  // Only genuinely-unread notes default to collapsed, so the
                  // first open is still the one that fires the read POST.
                  const isOpen = expandedCards[cardId] !== undefined ? expandedCards[cardId] : note.isRead;
                  return (
                    <div key={cardId} style={{ marginBottom: '8px', background: isOpen ? '#fff' : '#f5f6ff', borderRadius: '10px', border: `1px solid ${note.isRead ? '#e0e7ff' : '#818cf8'}`, overflow: 'hidden' }}>
                      <div style={{ padding: isMobile ? '10px' : '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, color: '#3730a3', fontWeight: 800, fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                            {formatDateDMY(note.date)} · Period {note.periodIndex}{note.subject ? ` · ${note.subject}` : ''}
                          </p>
                          {!note.isRead && <span style={{ padding: '1px 8px', borderRadius: '999px', background: '#818cf8', color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>NEW</span>}
                        </div>
                        <p style={{ margin: '3px 0 8px', color: '#4338ca', fontSize: '0.78rem', fontWeight: 600 }}>By {note.senderName}</p>
                        <button
                          onClick={() => openPeriodNoteUpdate(note, cardId, isOpen)}
                          style={{ border: '1px solid #6366f1', background: isOpen ? '#eef2ff' : '#4338ca', color: isOpen ? '#4338ca' : '#fff', borderRadius: '999px', padding: '6px 14px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          {isOpen ? '▲ Close' : '▼ Open Update'}
                        </button>
                      </div>
                      {isOpen && (
                        <div style={{ padding: isMobile ? '0 10px 10px' : '0 12px 12px', borderTop: '1px solid #eef2ff', fontSize: '0.85rem', color: '#374151' }}>
                          {note.classwork && <p style={{ margin: '8px 0 0' }}><strong>Classwork:</strong> {note.classwork}</p>}
                          {note.homework && <p style={{ margin: '8px 0 0' }}><strong>Homework:</strong> {note.homework}</p>}
                          {note.specialInstructions && <p style={{ margin: '8px 0 0' }}><strong>Instructions:</strong> {note.specialInstructions}</p>}
                          {note.attachments && note.attachments.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {note.attachments.map((a) => (
                                <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>
                                  📎 {a.originalFilename || a.docType}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activityDrillLevel === 'month' && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c7d2fe', padding: isMobile ? '10px' : '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <button onClick={() => changeMonthKeepingDay(activityMonth, setActivityMonth, selectedActivityDate, setSelectedActivityDate, -1)} style={navButtonStyle}>←</button>
                  <h4 style={{ margin: 0, color: '#3730a3', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>{activityMonth.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</h4>
                  <button onClick={() => changeMonthKeepingDay(activityMonth, setActivityMonth, selectedActivityDate, setSelectedActivityDate, 1)} style={navButtonStyle}>→</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  {weekdayLabels.map((label) => (
                    <div key={label} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#6366f1' }}>{label}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {activityMonthGrid.map((date, index) => (
                    date ? (
                      <button
                        key={formatDateKey(date)}
                        onClick={() => { setSelectedActivityDate(date); setActivityDrillLevel('week'); }}
                        style={{
                          border: `1px solid ${isSameDate(date, selectedActivityDate) ? '#6366f1' : '#e0e7ff'}`,
                          background: isSameDate(date, selectedActivityDate) ? '#818cf8' : '#fff',
                          color: isSameDate(date, selectedActivityDate) ? '#fff' : '#3730a3',
                          borderRadius: '8px',
                          padding: '8px 2px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: isMobile ? '0.8rem' : '0.88rem',
                        }}
                      >
                        {date.getDate()}
                      </button>
                    ) : <div key={`blank-${index}`} />
                  ))}
                </div>
              </div>
            )}

            {activityDrillLevel === 'week' && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c7d2fe', padding: isMobile ? '10px' : '14px' }}>
                <button onClick={() => setActivityDrillLevel('month')} style={backLinkStyle}>← Back to Month</button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <button onClick={() => changeActivityWeek(-1)} style={navButtonStyle}>←</button>
                  <h4 style={{ margin: 0, color: '#3730a3', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>Week of {formatDateDMY(activityWeekStrip[0])}</h4>
                  <button onClick={() => changeActivityWeek(1)} style={navButtonStyle}>→</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {activityWeekStrip.map((date) => (
                    <button
                      key={formatDateKey(date)}
                      onClick={() => { setSelectedActivityDate(date); setActivityDrillLevel('day'); }}
                      style={{
                        border: `1px solid ${isSameDate(date, selectedActivityDate) ? '#6366f1' : '#c7d2fe'}`,
                        background: isSameDate(date, selectedActivityDate) ? '#818cf8' : '#fff',
                        color: isSameDate(date, selectedActivityDate) ? '#fff' : '#3730a3',
                        borderRadius: '10px',
                        padding: '6px 2px',
                        cursor: 'pointer',
                        minHeight: '54px',
                        transition: 'all 180ms ease',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>{formatDateIST(date, { weekday: 'short' })}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800 }}>{date.getDate()}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activityDrillLevel === 'day' && (
              <>
                <button onClick={() => setActivityDrillLevel('week')} style={backLinkStyle}>← Back to Week</button>
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c7d2fe', padding: isMobile ? '10px' : '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#3730a3', fontSize: isMobile ? '1.02rem' : '1.1rem', fontWeight: 700 }}>{formatDateDMY(selectedActivityDate, { withWeekday: true })}</h4>
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
                {selectedActivityEntries.length ? selectedActivityEntries.map((activity, index) => {
                  const cardId = `activity-${activity.date}-${activity.period}`;
                  const isOpen = isAccordionOpen(cardId, index);

                  return (
                    <div key={cardId} style={{ marginBottom: '10px', background: '#fff', borderRadius: '10px', border: '1px solid #a5b4fc', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.1)', overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleAccordion(cardId)}
                        style={{ width: '100%', border: 'none', background: '#fff', padding: isMobile ? '10px 12px' : '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <p style={{ margin: 0, color: '#3730a3', fontWeight: 800, fontSize: isMobile ? '0.9rem' : '0.95rem', textAlign: 'left' }}>{activity.period}</p>
                        <span style={{ color: '#3730a3', fontWeight: 800, fontSize: '1rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}>⌃</span>
                      </button>
                      <div style={{ maxHeight: isOpen ? '240px' : '0px', opacity: isOpen ? 1 : 0, overflow: 'hidden', transition: 'max-height 240ms ease, opacity 220ms ease' }}>
                        <div style={{ padding: isMobile ? '0 12px 12px' : '0 14px 14px', borderTop: '1px solid #e0e7ff' }}>
                          <p style={{ margin: '10px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem' }}>{activityView === 'classwork' ? activity.classwork : activity.homework}</p>
                          <p style={{ margin: '8px 0 0', color: '#6366f1', fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700 }}>👩‍🏫 {activity.teacher}</p>
                          {activity.attachments.length > 0 && (
                            <button onClick={() => openAttachmentPreview(`${activity.period} Attachment`, activity.attachments)} style={{ marginTop: '8px', border: '1px solid #6366f1', background: '#eef2ff', color: '#3730a3', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {activity.attachments.length} Attachment</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #6366f1', color: '#3730a3', fontWeight: 600 }}>No activities found for selected date/search.</div>
                )}
              </>
            )}
          </div>
        );
      }
      case 'circular':
        return (
          <div style={{ padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%)', border: '2px solid #fb7185', boxShadow: '0 4px 16px rgba(244, 63, 94, 0.1)' }}>
            <h3 style={{ color: '#9f1239', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '12px' }}>
              📢 Communication <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 600, color: '#be123c' }}>(from School)</span>
            </h3>
            <input
              value={circularSearch}
              onChange={(e) => setCircularSearch(e.target.value)}
              placeholder="Search circulars"
              style={{ width: '100%', minHeight: '40px', border: '1px solid #fda4af', borderRadius: '999px', padding: '0 14px', fontSize: isMobile ? '0.85rem' : '0.9rem', outline: 'none', marginBottom: '12px' }}
            />
            {filteredCircularNotices.length ? filteredCircularNotices.map((notice, index) => {
              const cardId = `circular-${notice.id ?? index}`;
              // Deliberately not isAccordionOpen's shared "first item open by
              // default" convenience — a genuinely unread notice starts
              // collapsed so the read/opened count (toggleCircularAccordion's
              // read POST) only ever fires on an actual tap, never just from
              // being newest. Once actually read, it stays expanded across
              // refreshes too — expandedCards is local UI state that resets
              // on reload, but isRead is persisted server-side.
              const isOpen = expandedCards[cardId] !== undefined ? expandedCards[cardId] : notice.isRead;
              const isDeepLinked = deepLinkNoticeId && String(notice.id) === deepLinkNoticeId;

              return (
                <div id={cardId} key={cardId} style={{ marginBottom: '10px', background: '#fff', borderRadius: '12px', border: isDeepLinked ? '2px solid #f43f5e' : '1px solid #fecdd3', boxShadow: isDeepLinked ? '0 0 0 4px rgba(244,63,94,0.12)' : 'none', overflow: 'hidden' }}>
                  <div style={{ padding: isMobile ? '12px' : '14px' }}>
                    <p style={{ margin: 0, color: '#9f1239', fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1rem' }}>
                      {notice.title}
                      {notice.isArchived && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, verticalAlign: 'middle' }}>Archived</span>}
                      {isDeepLinked && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', background: '#f43f5e', color: '#fff', fontSize: '0.7rem', fontWeight: 700, verticalAlign: 'middle' }}>📬 From your notification</span>}
                    </p>
                    {notice.issuedBy && (
                      <p style={{ margin: '2px 0 0', color: '#9f1239', fontWeight: 600, fontSize: isMobile ? '0.72rem' : '0.78rem' }}>By {notice.issuedBy}</p>
                    )}
                    <p style={{ margin: '4px 0 10px', color: '#be123c', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
                      Sent: {formatDateDMY(notice.date)}
                      {notice.eventDate && ` · Important: ${formatDateDMY(notice.eventDate)}`}
                    </p>
                    <button
                      onClick={() => toggleCircularAccordion(notice, cardId, isOpen)}
                      style={{ border: '1px solid #fb7185', background: isOpen ? '#fff1f2' : '#9f1239', color: isOpen ? '#9f1239' : '#fff', borderRadius: '999px', padding: '7px 16px', fontWeight: 700, fontSize: isMobile ? '0.8rem' : '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isOpen ? '▲ Close' : '▼ Open Notice'}
                    </button>
                  </div>
                  {/* maxHeight here is just the collapse/expand animation's
                      vehicle, not a real content limit — 320px silently
                      clipped anything longer (the attachment button lives
                      below the body text, so a long notice hid it entirely
                      with no visual sign anything was missing). 4000px is
                      larger than any real notice will ever reach; overflowY
                      auto is the safety net for the rare one that does. */}
                  <div style={{ maxHeight: isOpen ? '4000px' : '0px', overflow: isOpen ? 'auto' : 'hidden', opacity: isOpen ? 1 : 0, transition: 'max-height 240ms ease, opacity 220ms ease' }}>
                    <div style={{ padding: isMobile ? '0 12px 12px' : '0 14px 14px', borderTop: '1px solid #ffe4e6' }}>
                      <style>{'.notice-body-html { overflow-wrap: anywhere; max-width: 100%; } .notice-body-html * { white-space: normal !important; overflow-wrap: anywhere !important; max-width: 100% !important; }'}</style>
                      <div className="notice-body-html" style={{ margin: '10px 0 0', color: '#374151', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notice.body) }} />
                      {notice.attachments.length > 0 && (
                        <button onClick={() => openAttachmentPreview(notice.title, notice.attachments)} style={{ marginTop: '8px', border: '1px solid #fb7185', background: '#fff1f2', color: '#9f1239', borderRadius: '999px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>📎 {notice.attachments.length} Attachment</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ background: '#fff', padding: isMobile ? '14px' : '18px', borderRadius: '12px', border: '1px dashed #fb7185', color: '#9f1239', fontWeight: 600 }}>No circulars found for this search.</div>
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
                  <p style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem' }}><strong>{formatDateDMY(inst.dueDate)}:</strong> {formatCurrency(inst.amount)}</p>
                  {inst.status === 'paid' && <p style={{ margin: '4px 0 0', fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#166534' }}>Paid on {formatDateDMY(inst.paidOn)} via {inst.mode}</p>}
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
            <h3 style={{ color: '#374151', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: '700', marginBottom: '16px' }}>📞 Important Contacts</h3>
            {contacts.map(contact => (
              <div key={contact.role} style={{ marginBottom: '12px', padding: isMobile ? '12px' : '14px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(107, 114, 128, 0.1)', minHeight: isMobile ? '44px' : 'auto' }}>
                <p style={{ margin: '0 0 6px', fontSize: isMobile ? '0.9rem' : '0.95rem' }}><strong style={{ color: '#374151' }}>👤 {contact.role}:</strong> {contact.name}</p>
                <p style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.9rem' }}><strong>📧 Email:</strong> <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', wordBreak: 'break-all' }}>{contact.email}</a></p>
              </div>
            ))}
          </div>
        );
      case 'documents':
        return <MyDocuments />;
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <main style={{ padding: isMobile ? '12px 12px 80px' : '24px', maxWidth: '1240px', margin: '0 auto', color: '#1f2937', background: 'linear-gradient(180deg, #fff1f2 0%, #fff7ed 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section style={{ marginBottom: '16px' }}>
        <div style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid #fecdd3', boxShadow: '0 12px 28px rgba(244, 63, 94, 0.15)' }}>
          <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)', color: '#fff', padding: isMobile ? '14px' : '20px', position: 'relative' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.7rem', fontWeight: 800 }}>Parents Portal</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: '#ffe4e6', fontWeight: 600, fontSize: isMobile ? '0.84rem' : '0.95rem' }}>SMT School, Thane</p>
              {pushStatus !== 'unsupported' && (
                <button
                  type="button"
                  onClick={pushStatus === 'on' ? disablePushNotifications : enablePushNotifications}
                  disabled={pushStatus === 'busy'}
                  style={{ border: '1px solid rgba(255,255,255,0.6)', background: pushStatus === 'on' ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff', borderRadius: '999px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: pushStatus === 'busy' ? 'default' : 'pointer', opacity: pushStatus === 'busy' ? 0.7 : 1 }}
                >
                  {pushStatus === 'on' ? '🔔 Notifications On' : pushStatus === 'busy' ? 'Working…' : '🔕 Enable Notifications'}
                </button>
              )}
            </div>
            {serverNotifications.unreadCount > 0 && (
              <div
                title={serverNotifications.notifications.slice(0, 5).map((n) => n.title).join('\n')}
                style={{ position: 'absolute', top: isMobile ? '10px' : '16px', right: isMobile ? '10px' : '16px', background: '#fff', color: '#e11d48', borderRadius: '999px', padding: '4px 10px', fontWeight: 800, fontSize: '0.78rem' }}
              >
                🔔 {serverNotifications.unreadCount}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', padding: isMobile ? '12px' : '16px' }}>
            <div style={{ border: '1px solid #fecdd3', borderRadius: '12px', background: '#fff1f2', padding: isMobile ? '10px' : '12px', marginBottom: linkedStudents.length > 0 ? '12px' : 0 }}>
              {linkedStudents.length === 0 ? (
                <p style={{ margin: 0, color: '#9f1239', fontWeight: 700, fontSize: isMobile ? '0.85rem' : '0.92rem' }}>
                  {linkedStudentsLoaded ? 'No student is linked to this account.' : 'Loading…'}
                </p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={currentStudent.photo} alt="Current Student" style={{ width: isMobile ? '52px' : '60px', height: isMobile ? '52px' : '60px', borderRadius: '12px', border: '2px solid #fb7185', background: '#fff' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#9f1239', fontSize: isMobile ? '0.95rem' : '1.05rem' }}>{currentStudent.name}</p>
                    <p style={{ margin: '4px 0 0', color: '#be123c', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>{currentStudent.grade} • {currentStudent.division} • Roll {currentStudent.rollNo}</p>
                  </div>
                </div>
              )}
            </div>

            {linkedStudents.length > 1 && (
              <>
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
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '16px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '16px', padding: isMobile ? '12px' : '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#9f1239', fontSize: isMobile ? '1rem' : '1.1rem' }}>Quick Access</h3>
          <span style={{ fontSize: isMobile ? '0.75rem' : '0.82rem', color: '#be123c', fontWeight: 600 }}>Linked Students: {linkedStudents.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, minmax(95px, 1fr))', gap: '8px' }}>
          {workingModules.map((module) => {
            const badgeCount = moduleBadgeCounts[module.key] || 0;
            return (
              <button
                key={module.key}
                onClick={() => openModule(module.key)}
                style={{
                  position: 'relative',
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
                {badgeCount > 0 && (
                  <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '999px', background: '#e11d48', color: '#fff', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(225,29,72,0.5)' }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
                <span style={{ fontSize: isMobile ? '1.05rem' : '1.2rem' }}>{module.icon}</span>
                <span style={{ fontSize: isMobile ? '0.66rem' : '0.78rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{module.label}</span>
              </button>
            );
          })}
        </div>

        <h4 style={{ margin: '14px 0 8px', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🚧 Upcoming Features</h4>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, minmax(95px, 1fr))', gap: '8px' }}>
          {upcomingModules.map((module) => (
            <div
              key={module.key}
              style={{
                border: '1px dashed #e2e8f0',
                background: '#fafafa',
                borderRadius: '12px',
                padding: isMobile ? '8px 6px' : '10px 8px',
                minHeight: isMobile ? '72px' : '82px',
                cursor: 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: '#94a3b8',
                opacity: 0.85,
              }}
            >
              <span style={{ fontSize: isMobile ? '1.05rem' : '1.2rem' }}>{module.icon}</span>
              <span style={{ fontSize: isMobile ? '0.66rem' : '0.78rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{module.label}</span>
            </div>
          ))}
        </div>
      </section>

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
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              zIndex: 1090,
              opacity: isMenuOpen ? 1 : 0,
              pointerEvents: isMenuOpen ? 'auto' : 'none',
              transition: 'opacity 180ms ease',
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                background: '#fff',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px',
                padding: '12px 14px 18px',
                boxShadow: '0 -10px 24px rgba(15, 23, 42, 0.25)',
                transform: isMenuOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 220ms ease',
              }}
            >
              <div style={{ width: '52px', height: '5px', borderRadius: '8px', background: '#e5e7eb', margin: '0 auto 12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {workingModules.map((module) => (
                  <button
                    key={module.key}
                    onClick={() => {
                      openModule(module.key);
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
                {attachmentPreview.attachments.map((fileItem, index) => {
                  const token = window.localStorage.getItem('smt-school-token') || '';
                  const tokenQuery = token ? `?access_token=${encodeURIComponent(token)}` : '';

                  return (
                  <div key={`${fileItem.id}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderBottom: index === attachmentPreview.attachments.length - 1 ? 'none' : '1px solid #ffe4e6' }}>
                    <span style={{ color: '#334155', fontSize: isMobile ? '0.82rem' : '0.9rem', wordBreak: 'break-all' }}>{fileItem.fileName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <a href={`${fileItem.previewUrl}${tokenQuery}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', border: '1px solid #fb7185', background: '#fff', color: '#9f1239', borderRadius: '999px', padding: '5px 10px', fontWeight: 700, whiteSpace: 'nowrap', fontSize: isMobile ? '0.75rem' : '0.8rem' }}>Preview</a>
                      <a href={`${fileItem.downloadUrl}${tokenQuery}`} style={{ textDecoration: 'none', border: '1px solid #fb7185', background: '#fff1f2', color: '#9f1239', borderRadius: '999px', padding: '5px 10px', fontWeight: 700, whiteSpace: 'nowrap', fontSize: isMobile ? '0.75rem' : '0.8rem' }}>Download</a>
                    </div>
                  </div>
                );})}
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
                    <p style={{ margin: '4px 0 0', color: '#475569', fontSize: isMobile ? '0.78rem' : '0.84rem' }}>{entry.instalment.id} • {formatCurrency(entry.instalment.amount)} • Paid on {formatDateDMY(entry.instalment.paidOn)}</p>
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

      {/* Toast notifications */}
      {notifications.length > 0 && (
        <div style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 1500, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: '12px 18px', borderRadius: '12px', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 8px 20px rgba(22,163,74,0.35)', maxWidth: '320px' }}>
              ✓ {n.message}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default Parents;