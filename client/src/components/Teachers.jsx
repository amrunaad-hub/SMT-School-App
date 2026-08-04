import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateKey, isSameDate, generateCalendarDays, buildWeekStrip, jsDayToApiDay } from '../utils/calendarHelpers';
import { formatDateDMY } from '../utils/formatDate';
import AttendanceModal from './AttendanceModal';

// Honest placeholder while the real logged-in teacher's profile is loading —
// deliberately not a real-looking name/class, unlike the old DEMO_TEACHER
// fallback this replaced. That fallback silently stayed in place forever for
// any account with no linked staff record (admin, the shared demo
// `teacher`/`teacher` login), and its classGrade/classDivision were real
// values (3/alpha) — so the page went on to fetch and display the actual
// Grade 3 Alpha class's real students/timetable/attendance, mislabeled as
// the viewer's own class. See `profileStatus` below for the real fix: no
// class data is fetched or shown until a real staff profile resolves.
const EMPTY_TEACHER = {
  name: 'Loading…',
  code: '',
  classGrade: null,
  classDivision: null,
  classDivisionLabel: '',
  subjects: [],
  isClassTeacher: false,
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIVISIONS = ['alpha', 'beta', 'gamma'];

const getSaturdayOccurrence = (date) => Math.floor((date.getDate() - 1) / 7) + 1;
const isWorkingDayFor = (date) => {
  const day = date.getDay();
  if (day === 0) return false;
  if (day === 6) return ![2, 4].includes(getSaturdayOccurrence(date));
  return true;
};

// AttendanceModal now lives in its own file (shared with Timetable.jsx's
// Full Timetable page) — see ./AttendanceModal.

// ── Calendar picker (compact) ─────────────────────────────────────────────────
const DatePicker = ({ selectedDate, onSelect, onClose }) => {
  const [month, setMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = generateCalendarDays(month);
  return (
    <div style={{ position: 'absolute', top: '46px', right: 0, zIndex: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', boxShadow: '0 12px 30px rgba(15,23,42,0.18)', width: '260px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>←</button>
        <strong style={{ fontSize: '0.85rem' }}>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</strong>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>→</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '0.72rem' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{d}</div>)}
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            disabled={!d}
            onClick={() => { onSelect(d); onClose(); }}
            style={{
              border: 'none', borderRadius: '6px', padding: '6px 0', cursor: d ? 'pointer' : 'default',
              background: d && isSameDate(d, selectedDate) ? '#1e3a8a' : 'transparent',
              color: d && isSameDate(d, selectedDate) ? '#fff' : d ? '#334155' : 'transparent',
              fontWeight: d && isSameDate(d, selectedDate) ? 700 : 400,
            }}
          >
            {d ? d.getDate() : '·'}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main Teachers Component ───────────────────────────────────────────────────
const Teachers = () => {
  const [activeModule, setActiveModule] = useState('timetable');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceGrade, setAttendanceGrade] = useState(null);
  const [attendanceDivision, setAttendanceDivision] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [dayPeriods, setDayPeriods] = useState([]);
  const [periodNotes, setPeriodNotes] = useState([]);
  const [teacher, setTeacher] = useState(EMPTY_TEACHER);
  // 'loading' | 'linked' | 'unlinked' — gates whether any class data (roster,
  // timetable, attendance) gets fetched/rendered at all. 'unlinked' means
  // this login has no staff record (admin, the shared demo teacher login).
  const [profileStatus, setProfileStatus] = useState('loading');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dayAttendance, setDayAttendance] = useState([]);
  // 'unsupported' | 'off' | 'on' | 'busy' — push notification opt-in state.
  const [pushStatus, setPushStatus] = useState(
    ('serviceWorker' in navigator && 'PushManager' in window) ? 'off' : 'unsupported'
  );

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
    } catch {
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
    } catch {
      setPushStatus('on');
    }
  };

  // Same re-association-on-load as the parent portal: a push subscription is
  // per-device, not per-login, so on a shared device this re-binds it to
  // whoever is actually logged in now. Enabled by default — auto-subscribes
  // instead of waiting for a manual click, unless already explicitly denied.
  useEffect(() => {
    if (pushStatus === 'unsupported') return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) {
          setPushStatus('off');
          if (Notification.permission !== 'denied') enablePushNotifications();
          return;
        }
        api.post('/api/push/subscribe', sub.toJSON()).catch(() => {});
        setPushStatus('on');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/api/auth/me/staff-profile')
      .then((data) => {
        const profile = data.staffProfile;
        const classTeacherEntry = profile && (profile.currentClassTeacherOf || [])[0];
        const cls = classTeacherEntry || (profile && (profile.classAssignments || [])[0]);
        if (!profile || !cls) { setProfileStatus('unlinked'); return; }
        setTeacher({
          name: profile.displayName,
          code: profile.staffCode,
          classGrade: cls.grade,
          classDivision: cls.division,
          classDivisionLabel: cls.division.charAt(0).toUpperCase() + cls.division.slice(1),
          subjects: profile.assignedSubjects || [],
          isClassTeacher: !!classTeacherEntry,
        });
        setProfileStatus('linked');
      })
      .catch(() => setProfileStatus('unlinked'));
  }, []);

  const dateStr = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const dayOfWeek = useMemo(() => jsDayToApiDay(selectedDate.getDay()), [selectedDate]);
  const isWorkingDay = useMemo(() => isWorkingDayFor(selectedDate), [selectedDate]);

  const divisionOptions = teacher.isClassTeacher ? DIVISIONS : [teacher.classDivision];

  // Every fetch below is gated on profileStatus === 'linked' — without a real
  // staff profile there's no legitimate grade/division to query, and querying
  // anyway (as the old DEMO_TEACHER fallback did) means an unlinked account
  // silently sees another real class's real data.
  useEffect(() => {
    if (profileStatus !== 'linked') { setClassStudents([]); return; }
    api.get('/api/students', { grade: teacher.classGrade, division: teacher.classDivision, limit: 40 })
      .then((data) => {
        setClassStudents((data.students || []).map((s) => ({ id: s._id, name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo })));
      })
      .catch(() => setClassStudents([]));
  }, [profileStatus, teacher.classGrade, teacher.classDivision]);

  useEffect(() => {
    if (profileStatus !== 'linked' || !isWorkingDay || !dayOfWeek) { setDayPeriods([]); return; }
    api.get('/api/timetable', { grade: teacher.classGrade, division: teacher.classDivision, day: dayOfWeek })
      .then((data) => setDayPeriods(data.periods || []))
      .catch(() => setDayPeriods([]));
  }, [profileStatus, dayOfWeek, isWorkingDay, teacher.classGrade, teacher.classDivision]);

  useEffect(() => {
    if (profileStatus !== 'linked') { setPeriodNotes([]); return; }
    api.get('/api/period-notes', { grade: teacher.classGrade, division: teacher.classDivision, date: dateStr })
      .then((data) => setPeriodNotes(data.notes || []))
      .catch(() => setPeriodNotes([]));
  }, [profileStatus, dateStr, teacher.classGrade, teacher.classDivision]);

  const refreshDayAttendance = () => {
    if (profileStatus !== 'linked') { setDayAttendance([]); return; }
    api.get('/api/attendance', { date: dateStr, grade: teacher.classGrade, division: teacher.classDivision })
      .then((rows) => setDayAttendance(rows || []))
      .catch(() => setDayAttendance([]));
  };
  useEffect(refreshDayAttendance, [profileStatus, dateStr, teacher.classGrade, teacher.classDivision]);

  const firstPeriod = useMemo(() => dayPeriods.find((p) => p.type === 'Period'), [dayPeriods]);
  const notesByPeriod = useMemo(() => Object.fromEntries(periodNotes.map((n) => [n.periodIndex, n])), [periodNotes]);

  const openAttendance = () => {
    setAttendanceGrade(teacher.classGrade);
    setAttendanceDivision(teacher.classDivision);
    setShowAttendanceModal(true);
  };

  const navigateDay = (delta) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + delta);
    setSelectedDate(next);
  };

  const tabs = [
    { key: 'timetable', label: "⏰ Day's Timetable" },
    { key: 'attendance', label: '✅ Attendance Records' },
    { key: 'upcoming', label: '🚧 Upcoming Features' },
  ];

  // Full Timetable / Communication / My Documents are separate pages (not
  // internal tab state), but sit in the same uniform tab row as the ones
  // above instead of a visually distinct "Quick Links" section — one
  // consistent navigation strip, not two different-looking concepts.
  const externalTabs = [
    { to: '/timetable', label: '📅 Full Timetable' },
    { to: '/communication', label: '💬 Communication' },
    { to: '/my-documents', label: '📁 My Documents' },
  ];

  const UPCOMING_LINKS = [
    { title: 'Exams', desc: 'Assessment schedules and marks.', color: '#b45309' },
    { title: 'Attendance Module', desc: 'School-wide attendance analytics.', color: '#059669' },
  ];

  const cardBase = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' };

  const renderTimetable = () => (
    <div>
      <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: isWorkingDay ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isWorkingDay ? '#bbf7d0' : '#fde68a'}` }}>
        <strong style={{ color: isWorkingDay ? '#166534' : '#92400e' }}>{isWorkingDay ? '✅ Working Day' : '⚠ Holiday / Off Day'}</strong>
        <span style={{ marginLeft: '10px', color: isWorkingDay ? '#166534' : '#92400e', fontSize: '0.88rem' }}>{formatDateDMY(selectedDate, { withWeekday: true })}</span>
      </div>

      {!isWorkingDay ? (
        <div style={{ ...cardBase, textAlign: 'center', color: '#92400e' }}>No timetable for this day — non-working day.</div>
      ) : dayPeriods.length === 0 ? (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>No timetable data available for this day.</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {dayPeriods.map((period, idx) => {
            const isBreak = period.type !== 'Period';
            const isFirst = period === firstPeriod;
            const note = period.periodIndex !== undefined ? notesByPeriod[period.periodIndex] : null;
            const hasNote = note && (note.classwork || note.homework || note.specialInstructions);
            const periodLink = period.periodIndex !== undefined
              ? `/timetable/period/${teacher.classGrade}/${teacher.classDivision}/${period.periodIndex}/${dateStr}`
              : null;

            const cardContent = (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{period.subject}</strong>
                    {isFirst && !isBreak && <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>First Period</span>}
                    {hasNote && <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>📝 Notes added</span>}
                  </div>
                  <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.82rem' }}>{period.type} · {period.time}</div>
                  {!isBreak && <div style={{ marginTop: '2px', color: '#475569', fontSize: '0.8rem' }}>Teacher: {period.teacherName || '—'} · Room: {period.room || '—'}</div>}
                </div>
                {isFirst && !isBreak && (
                  <button type="button" onClick={(e) => { e.preventDefault(); openAttendance(); }} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}>
                    📋 Record Attendance
                  </button>
                )}
              </div>
            );

            return periodLink ? (
              <Link key={idx} to={periodLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ ...cardBase, borderLeft: `5px solid ${isBreak ? '#fcd34d' : period.type === 'Prayer & Assembly' ? '#60a5fa' : '#6366f1'}`, background: isFirst ? '#f0f9ff' : '#fff' }}>
                  {cardContent}
                </div>
              </Link>
            ) : (
              <div key={idx} style={{ ...cardBase, borderLeft: `5px solid ${isBreak ? '#fcd34d' : '#60a5fa'}` }}>{cardContent}</div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAttendanceRecords = () => {
    const isLocked = dayAttendance[0]?.isLocked;

    if (dayAttendance.length === 0) {
      return (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b', padding: '32px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No attendance submitted yet for {dateStr}.</p>
          <button type="button" onClick={openAttendance} style={{ marginTop: '14px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}>
            📋 Record Attendance
          </button>
        </div>
      );
    }
    const grouped = {
      present: dayAttendance.filter((r) => r.status === 'Present'),
      absent: dayAttendance.filter((r) => r.status === 'Absent'),
      late: dayAttendance.filter((r) => r.status === 'Late'),
    };
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[['Present', grouped.present.length, '#166534', '#dcfce7'], ['Absent', grouped.absent.length, '#dc2626', '#fee2e2'], ['Late', grouped.late.length, '#d97706', '#fef3c7']].map(([label, count, color, bg]) => (
            <div key={label} style={{ ...cardBase, textAlign: 'center', background: bg, border: `1px solid ${color}44` }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{count}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{label}</div>
            </div>
          ))}
        </div>
        {isLocked ? (
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '10px' }}>🔒 Locked — parents have been notified.</p>
        ) : (
          <button type="button" onClick={openAttendance} style={{ marginBottom: '14px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>
            📋 Edit / Lock Attendance
          </button>
        )}
        {[['Absent Students', grouped.absent, '#dc2626', '#fee2e2'], ['Late Arrivals', grouped.late, '#d97706', '#fef3c7']].map(([title, list, color, bg]) => list.length > 0 && (
          <div key={title} style={{ ...cardBase, marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 10px', color }}>{title} ({list.length})</h4>
            <div style={{ display: 'grid', gap: '6px' }}>
              {list.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: bg, flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{e.student.firstName} {e.student.lastName}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Roll {e.rollNo}{e.reason ? ` · ${e.reason}` : ''}</span>
                  {e.leaveRequest && (
                    <button
                      type="button"
                      onClick={() => setViewLeaveFor({ firstName: e.student.firstName, lastName: e.student.lastName, leaveRequest: e.leaveRequest })}
                      style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                      📩 Parent's regularization response
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUpcoming = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      {UPCOMING_LINKS.map((item) => (
        <div key={item.title} style={{ ...cardBase, borderLeft: `5px solid ${item.color}`, opacity: 0.7, cursor: 'not-allowed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h3>
            <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 700 }}>Coming soon</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#475569' }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );

  return (
    <main style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <section style={{ borderRadius: '16px', padding: '20px 24px', border: '1px solid #bfdbfe', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', boxShadow: '0 10px 22px rgba(30,64,175,0.1)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e3a8a', fontWeight: 800 }}>Teachers Portal</h2>
            <p style={{ margin: '6px 0 0', color: '#334155', fontSize: '0.9rem' }}>
              {profileStatus === 'loading' && 'Loading your teacher profile…'}
              {profileStatus === 'unlinked' && 'No teacher profile is linked to this login.'}
              {profileStatus === 'linked' && (
                <>Welcome, <strong>{teacher.name}</strong> · {teacher.isClassTeacher ? 'Class Teacher, ' : ''}Grade {teacher.classGrade} {teacher.classDivisionLabel} · {classStudents.length} students</>
              )}
            </p>
            {pushStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={pushStatus === 'on' ? disablePushNotifications : enablePushNotifications}
                disabled={pushStatus === 'busy'}
                style={{ marginTop: '8px', border: '1px solid #93c5fd', background: pushStatus === 'on' ? '#dbeafe' : '#fff', color: '#1e3a8a', borderRadius: '999px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: pushStatus === 'busy' ? 'default' : 'pointer', opacity: pushStatus === 'busy' ? 0.7 : 1 }}
              >
                {pushStatus === 'on' ? '🔔 Notifications On' : pushStatus === 'busy' ? 'Working…' : '🔕 Enable Notifications'}
              </button>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={() => navigateDay(-1)} style={{ border: '1px solid #bfdbfe', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>←</button>
            <button type="button" onClick={() => setShowDatePicker((v) => !v)} style={{ padding: '8px 14px', borderRadius: '12px', border: 'none', background: '#dbeafe', color: '#1e3a8a', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              📅 {formatDateDMY(selectedDate)}
            </button>
            <button type="button" onClick={() => navigateDay(1)} style={{ border: '1px solid #bfdbfe', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>→</button>
            {showDatePicker && <DatePicker selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowDatePicker(false)} />}
          </div>
        </div>
      </section>

      {profileStatus === 'unlinked' ? (
        <div style={{ ...cardBase, textAlign: 'center', padding: '32px 20px', color: '#475569' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>No teacher profile is linked to this login.</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem' }}>
            Teachers Portal shows an individual teacher's own class — this account isn't linked to a staff record, so there's no class to show.
            {externalTabs.length > 0 && ' Use the links below for school-wide views instead.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            {externalTabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                style={{ padding: '9px 16px', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', textDecoration: 'none' }}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      ) : profileStatus === 'loading' ? (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveModule(tab.key)}
                style={{ padding: '9px 16px', borderRadius: '999px', border: `1px solid ${activeModule === tab.key ? '#1e3a8a' : '#cbd5e1'}`, background: activeModule === tab.key ? '#1e3a8a' : '#fff', color: activeModule === tab.key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
              >
                {tab.label}
              </button>
            ))}
            {externalTabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                style={{ padding: '9px 16px', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', textDecoration: 'none' }}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {activeModule === 'timetable' && renderTimetable()}
          {activeModule === 'attendance' && renderAttendanceRecords()}
          {activeModule === 'upcoming' && renderUpcoming()}
        </>
      )}

      {showAttendanceModal && (
        <AttendanceModal
          date={dateStr}
          grade={attendanceGrade}
          division={attendanceDivision}
          divisionOptions={divisionOptions}
          onDivisionChange={setAttendanceDivision}
          onClose={() => { setShowAttendanceModal(false); refreshDayAttendance(); }}
          onLocked={refreshDayAttendance}
        />
      )}
    </main>
  );
};

export default Teachers;
