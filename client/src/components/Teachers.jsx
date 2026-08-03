import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateKey, isSameDate, generateCalendarDays, buildWeekStrip, jsDayToApiDay } from '../utils/calendarHelpers';

// Fallback identity shown until the real logged-in teacher's profile resolves
// (or permanently, for the shared demo `teacher` login / any account not yet
// linked to a staff record via GET /api/auth/me/staff-profile).
const DEMO_TEACHER = {
  name: 'Ms. Anuja Kulkarni',
  code: 'TCH001',
  classGrade: 3,
  classDivision: 'alpha',
  classDivisionLabel: 'Alpha',
  subjects: ['English', 'Library'],
  isClassTeacher: true,
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const DIVISION_LABEL = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };

const getSaturdayOccurrence = (date) => Math.floor((date.getDate() - 1) / 7) + 1;
const isWorkingDayFor = (date) => {
  const day = date.getDay();
  if (day === 0) return false;
  if (day === 6) return ![2, 4].includes(getSaturdayOccurrence(date));
  return true;
};

const STATUS_COLORS = { Present: '#16a34a', Absent: '#dc2626', Late: '#d97706', '': '#94a3b8' };
const STATUS_BG = { Present: '#dcfce7', Absent: '#fee2e2', Late: '#fef3c7', '': '#f1f5f9' };

// ── Attendance Capture Modal ──────────────────────────────────────────────────
const AttendanceModal = ({ date, grade, division, divisionOptions, onDivisionChange, onClose, onLocked }) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setSubmitted(false);
    api.get('/api/attendance/roster', { date, grade, division })
      .then((data) => {
        setRoster((data.roster || []).map((r) => ({ ...r, remark: r.reason || '' })));
        setIsLocked(!!data.isLocked);
        setLoading(false);
      })
      .catch((err) => { setError(err.message || 'Failed to load roster.'); setLoading(false); });
  }, [date, grade, division]);

  const setStatus = (studentId, status) => setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  const setRemark = (studentId, remark) => setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, remark } : r)));
  const [remarkOpen, setRemarkOpen] = useState(null);
  const [viewLeaveFor, setViewLeaveFor] = useState(null);
  const markAll = (status) => setRoster((prev) => prev.map((r) => ({ ...r, status })));

  const counts = useMemo(() => ({
    present: roster.filter((r) => r.status === 'Present').length,
    absent: roster.filter((r) => r.status === 'Absent').length,
    late: roster.filter((r) => r.status === 'Late').length,
  }), [roster]);

  const submit = async (lock) => {
    setSubmitting(true);
    setError('');
    try {
      const records = roster.map((r) => ({ studentId: r.studentId, status: r.status, reason: r.remark }));
      await api.post('/api/attendance/bulk', { date, grade, division, records, lock });
      setSubmitting(false);
      if (lock) { setIsLocked(true); setSubmitted(true); onLocked && onLocked(); } else { setSubmitted(true); }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to save attendance.');
    }
  };

  const btnBase = { border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', padding: '5px 10px', fontSize: '0.78rem' };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', width: '100%', maxWidth: '680px', boxShadow: '0 24px 60px rgba(15,23,42,0.3)', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Record Attendance</h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Grade {grade} {DIVISION_LABEL[division]} · {date}</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        {divisionOptions && divisionOptions.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'center' }}>Covering:</span>
            {divisionOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDivisionChange(d)}
                style={{ ...btnBase, background: d === division ? '#1e3a8a' : '#f1f5f9', color: d === division ? '#fff' : '#334155' }}
              >
                {DIVISION_LABEL[d]}
              </button>
            ))}
          </div>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading roster…</p>
        ) : isLocked ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h3 style={{ margin: '12px 0 6px', color: '#166534' }}>Attendance Locked</h3>
            <p style={{ color: '#475569' }}>Present: {counts.present} · Absent: {counts.absent} · Late: {counts.late}</p>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>An admin can unlock this date/class if a correction is needed.</p>
            <button type="button" onClick={onClose} style={{ marginTop: '16px', padding: '10px 28px', borderRadius: '10px', background: '#1e3a8a', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem' }}>💾</div>
            <h3 style={{ margin: '12px 0 6px', color: '#166534' }}>Draft Saved</h3>
            <p style={{ color: '#475569' }}>Present: {counts.present} · Absent: {counts.absent} · Late: {counts.late}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
              <button type="button" onClick={() => setSubmitted(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Keep Editing</button>
              <button type="button" onClick={() => submit(true)} disabled={submitting} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{submitting ? 'Locking…' : '🔒 Submit Final'}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Present', value: counts.present, color: '#166534', bg: '#dcfce7' },
                { label: 'Absent', value: counts.absent, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Late', value: counts.late, color: '#d97706', bg: '#fef3c7' },
              ].map((c) => (
                <div key={c.label} style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: c.bg }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button type="button" onClick={() => markAll('Present')} style={{ ...btnBase, background: '#dcfce7', color: '#166534' }}>✓ Mark All Present</button>
              <button type="button" onClick={() => markAll('Late')} style={{ ...btnBase, background: '#fef3c7', color: '#d97706' }}>⏱ Mark All Late</button>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              {roster.map((r, idx) => (
                <div key={r.studentId} style={{ padding: '10px 12px', borderBottom: idx < roster.length - 1 ? '1px solid #f1f5f9' : 'none', background: STATUS_BG[r.status] || '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '28px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>{r.rollNo}</div>
                    <div style={{ flex: 1, minWidth: '120px', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                      {r.firstName} {r.lastName}
                      {r.leaveRequest && (
                        <button type="button" onClick={() => setViewLeaveFor(r)} style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#d97706', fontWeight: 700, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                          📄 Leave Applied
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['Present', 'Absent', 'Late'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(r.studentId, status)}
                          style={{ ...btnBase, background: r.status === status ? STATUS_COLORS[status] : '#f1f5f9', color: r.status === status ? '#fff' : '#475569', minWidth: '54px' }}
                        >
                          {status === 'Present' ? '✓ P' : status === 'Absent' ? '✕ A' : '⏱ L'}
                        </button>
                      ))}
                      <button type="button" onClick={() => setRemarkOpen(remarkOpen === r.studentId ? null : r.studentId)} style={{ ...btnBase, background: '#f1f5f9', color: '#475569' }} title="Add remark">💬</button>
                    </div>
                  </div>
                  {remarkOpen === r.studentId && (
                    <input
                      type="text"
                      value={r.remark}
                      onChange={(e) => setRemark(r.studentId, e.target.value)}
                      placeholder="Add remark (optional)"
                      style={{ marginTop: '6px', width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => submit(false)} disabled={submitting} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button type="button" onClick={() => submit(true)} disabled={submitting} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {submitting ? 'Submitting…' : '🔒 Submit Final'}
              </button>
            </div>
          </>
        )}
      </div>

      {viewLeaveFor && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(e) => { if (e.target === e.currentTarget) setViewLeaveFor(null); }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 60px rgba(15,23,42,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.05rem' }}>Leave Applied — {viewLeaveFor.firstName} {viewLeaveFor.lastName}</h3>
              <button type="button" onClick={() => setViewLeaveFor(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: '0.76rem' }}>
                {viewLeaveFor.leaveRequest.type === 'advance' ? 'Advance Leave' : 'Regularization'}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.76rem' }}>
                {viewLeaveFor.leaveRequest.category || 'Casual'}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1e3a8a', fontWeight: 700, fontSize: '0.76rem' }}>
                {viewLeaveFor.leaveRequest.status}
              </span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#334155' }}>
              <strong>Dates:</strong> {viewLeaveFor.leaveRequest.fromDate === viewLeaveFor.leaveRequest.toDate ? viewLeaveFor.leaveRequest.fromDate : `${viewLeaveFor.leaveRequest.fromDate} → ${viewLeaveFor.leaveRequest.toDate}`}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#334155' }}>
              <strong>Reason:</strong> {viewLeaveFor.leaveRequest.reason}
            </p>
            {viewLeaveFor.leaveRequest.documents.length > 0 ? (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Supporting document(s):</p>
                {viewLeaveFor.leaveRequest.documents.map((doc) => (
                  <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginRight: '8px', marginBottom: '6px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e3a8a', fontSize: '0.8rem', textDecoration: 'none' }}>
                    📎 {doc.originalFilename || doc.docType}
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No supporting document attached.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [teacher, setTeacher] = useState(DEMO_TEACHER);
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
        if (!profile) return;
        const classTeacherEntry = (profile.currentClassTeacherOf || [])[0];
        const cls = classTeacherEntry || (profile.classAssignments || [])[0];
        if (!cls) return;
        setTeacher({
          name: profile.displayName,
          code: profile.staffCode,
          classGrade: cls.grade,
          classDivision: cls.division,
          classDivisionLabel: cls.division.charAt(0).toUpperCase() + cls.division.slice(1),
          subjects: profile.assignedSubjects || [],
          isClassTeacher: !!classTeacherEntry,
        });
      })
      .catch(() => {});
  }, []);

  const dateStr = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const dayOfWeek = useMemo(() => jsDayToApiDay(selectedDate.getDay()), [selectedDate]);
  const isWorkingDay = useMemo(() => isWorkingDayFor(selectedDate), [selectedDate]);

  const divisionOptions = teacher.isClassTeacher ? DIVISIONS : [teacher.classDivision];

  useEffect(() => {
    api.get('/api/students', { grade: teacher.classGrade, division: teacher.classDivision, limit: 40 })
      .then((data) => {
        setClassStudents((data.students || []).map((s) => ({ id: s._id, name: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo })));
      })
      .catch(() => setClassStudents([]));
  }, [teacher.classGrade, teacher.classDivision]);

  useEffect(() => {
    if (!isWorkingDay || !dayOfWeek) { setDayPeriods([]); return; }
    api.get('/api/timetable', { grade: teacher.classGrade, division: teacher.classDivision, day: dayOfWeek })
      .then((data) => setDayPeriods(data.periods || []))
      .catch(() => setDayPeriods([]));
  }, [dayOfWeek, isWorkingDay, teacher.classGrade, teacher.classDivision]);

  useEffect(() => {
    api.get('/api/period-notes', { grade: teacher.classGrade, division: teacher.classDivision, date: dateStr })
      .then((data) => setPeriodNotes(data.notes || []))
      .catch(() => setPeriodNotes([]));
  }, [dateStr, teacher.classGrade, teacher.classDivision]);

  const refreshDayAttendance = () => {
    api.get('/api/attendance', { date: dateStr, grade: teacher.classGrade, division: teacher.classDivision })
      .then((rows) => setDayAttendance(rows || []))
      .catch(() => setDayAttendance([]));
  };
  useEffect(refreshDayAttendance, [dateStr, teacher.classGrade, teacher.classDivision]);

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

  const UPCOMING_LINKS = [
    { title: 'Exams', desc: 'Assessment schedules and marks.', color: '#b45309' },
  ];

  const cardBase = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' };

  const renderTimetable = () => (
    <div>
      <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: isWorkingDay ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isWorkingDay ? '#bbf7d0' : '#fde68a'}` }}>
        <strong style={{ color: isWorkingDay ? '#166534' : '#92400e' }}>{isWorkingDay ? '✅ Working Day' : '⚠ Holiday / Off Day'}</strong>
        <span style={{ marginLeft: '10px', color: isWorkingDay ? '#166534' : '#92400e', fontSize: '0.88rem' }}>{DAY_LABELS[selectedDate.getDay()]}, {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
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
    if (dayAttendance.length === 0) {
      return (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b', padding: '32px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No attendance submitted yet for {dateStr}.</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.86rem' }}>Use the Timetable tab to record first-period attendance.</p>
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
        {dayAttendance[0]?.isLocked && (
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '10px' }}>🔒 Locked — parents have been notified.</p>
        )}
        {[['Absent Students', grouped.absent, '#dc2626', '#fee2e2'], ['Late Arrivals', grouped.late, '#d97706', '#fef3c7']].map(([title, list, color, bg]) => list.length > 0 && (
          <div key={title} style={{ ...cardBase, marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 10px', color }}>{title} ({list.length})</h4>
            <div style={{ display: 'grid', gap: '6px' }}>
              {list.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: bg }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{e.student.firstName} {e.student.lastName}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Roll {e.rollNo}{e.reason ? ` · ${e.reason}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLinks = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      {[
        { title: 'Full Timetable', desc: 'View consolidated school timetable.', to: '/timetable', color: '#1d4ed8' },
        { title: 'Attendance Module', desc: 'School-wide attendance analytics.', to: '/attendance', color: '#059669' },
        { title: 'Communication', desc: 'Send class circulars.', to: '/communication', color: '#7c3aed' },
      ].map((item) => (
        <a key={item.title} href={item.to} style={{ textDecoration: 'none', color: '#0f172a', ...cardBase, borderLeft: `5px solid ${item.color}` }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h3>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#475569' }}>{item.desc}</p>
        </a>
      ))}
    </div>
  );

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
              Welcome, <strong>{teacher.name}</strong> · {teacher.isClassTeacher ? 'Class Teacher, ' : ''}Grade {teacher.classGrade} {teacher.classDivisionLabel} · {classStudents.length} students
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
              📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </button>
            <button type="button" onClick={() => navigateDay(1)} style={{ border: '1px solid #bfdbfe', background: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>→</button>
            {showDatePicker && <DatePicker selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowDatePicker(false)} />}
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px', color: '#475569', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Links</h4>
        {renderLinks()}
      </div>

      {activeModule === 'timetable' && renderTimetable()}
      {activeModule === 'attendance' && renderAttendanceRecords()}
      {activeModule === 'upcoming' && renderUpcoming()}

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
