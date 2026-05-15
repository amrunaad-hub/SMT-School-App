import React, { useMemo, useState } from 'react';
import { SCHOOL_STUDENT_DIRECTORY } from '../data/studentDirectory';
import { buildClassTimetable } from '../data/facultyScheduler';

// Teacher identity (would come from auth context in a real app)
const TEACHER = {
  name: 'Ms. Anuja Kulkarni',
  code: 'TCH001',
  classGrade: 3,
  classDivision: 'alpha',
  classDivisionLabel: 'Alpha',
  subjects: ['English', 'Library'],
};

const TODAY = new Date();
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_COLORS = { present: '#16a34a', absent: '#dc2626', late: '#d97706', '': '#94a3b8' };
const STATUS_BG = { present: '#dcfce7', absent: '#fee2e2', late: '#fef3c7', '': '#f1f5f9' };

// ── Attendance Capture Modal ──────────────────────────────────────────────────
const AttendanceModal = ({ students, period, onClose, onSubmit }) => {
  const [marks, setMarks] = useState(() => {
    const m = {};
    students.forEach((s) => { m[s.id] = { status: '', remark: '' }; });
    return m;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(null);

  const setStatus = (id, status) => setMarks((prev) => ({ ...prev, [id]: { ...prev[id], status } }));
  const setRemark = (id, remark) => setMarks((prev) => ({ ...prev, [id]: { ...prev[id], remark } }));

  const markAll = (status) => {
    setMarks((prev) => {
      const next = { ...prev };
      students.forEach((s) => { next[s.id] = { ...next[s.id], status }; });
      return next;
    });
  };

  const counts = useMemo(() => {
    const list = Object.values(marks);
    return {
      present: list.filter((m) => m.status === 'present').length,
      absent: list.filter((m) => m.status === 'absent').length,
      late: list.filter((m) => m.status === 'late').length,
      pending: list.filter((m) => !m.status).length,
    };
  }, [marks]);

  const handleSubmit = (final) => {
    if (final && counts.pending > 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (final) { setSubmitted(true); onSubmit(marks); }
    }, 1000);
  };

  const btnBase = { border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', padding: '5px 10px', fontSize: '0.78rem', transition: 'opacity 150ms' };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', width: '100%', maxWidth: '680px', boxShadow: '0 24px 60px rgba(15,23,42,0.3)', marginTop: '20px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h3 style={{ margin: '12px 0 6px', color: '#166534' }}>Attendance Submitted!</h3>
            <p style={{ color: '#475569' }}>Grade {TEACHER.classGrade} {TEACHER.classDivisionLabel} — {period.type} recorded for {TODAY_STR}.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 14px', background: '#dcfce7', color: '#166534', borderRadius: '999px', fontWeight: 700 }}>Present: {counts.present}</span>
              <span style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '999px', fontWeight: 700 }}>Absent: {counts.absent}</span>
              <span style={{ padding: '6px 14px', background: '#fef3c7', color: '#d97706', borderRadius: '999px', fontWeight: 700 }}>Late: {counts.late}</span>
            </div>
            <button type="button" onClick={onClose} style={{ marginTop: '20px', padding: '10px 28px', borderRadius: '10px', background: '#1e3a8a', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Record Attendance</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Grade {TEACHER.classGrade} {TEACHER.classDivisionLabel} · {period.type} · {period.time} · {TODAY_STR}</p>
              </div>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {/* Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Strength', value: students.length, color: '#1e3a8a', bg: '#eff6ff' },
                { label: 'Present', value: counts.present, color: '#166534', bg: '#dcfce7' },
                { label: 'Absent', value: counts.absent, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Pending', value: counts.pending, color: '#64748b', bg: '#f1f5f9' },
              ].map((c) => (
                <div key={c.label} style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: c.bg }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Bulk actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button type="button" onClick={() => markAll('present')} style={{ ...btnBase, background: '#dcfce7', color: '#166534' }}>✓ Mark All Present</button>
              <button type="button" onClick={() => markAll('late')} style={{ ...btnBase, background: '#fef3c7', color: '#d97706' }}>⏱ Mark All Late</button>
              <button type="button" onClick={() => markAll('')} style={{ ...btnBase, background: '#f1f5f9', color: '#64748b' }}>↺ Reset All</button>
            </div>

            {/* Student list */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              {students.map((student, idx) => {
                const m = marks[student.id] || { status: '', remark: '' };
                return (
                  <div key={student.id} style={{ padding: '10px 12px', borderBottom: idx < students.length - 1 ? '1px solid #f1f5f9' : 'none', background: m.status ? STATUS_BG[m.status] : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: '28px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>{student.rollNo}</div>
                      <div style={{ flex: 1, minWidth: '120px', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{student.name}</div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {['present', 'absent', 'late'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatus(student.id, status)}
                            style={{ ...btnBase, background: m.status === status ? STATUS_COLORS[status] : '#f1f5f9', color: m.status === status ? '#fff' : '#475569', textTransform: 'capitalize', minWidth: '54px' }}
                          >
                            {status === 'present' ? '✓ P' : status === 'absent' ? '✕ A' : '⏱ L'}
                          </button>
                        ))}
                        <button type="button" onClick={() => setRemarkOpen(remarkOpen === student.id ? null : student.id)} style={{ ...btnBase, background: '#f1f5f9', color: '#475569' }} title="Add remark">💬</button>
                      </div>
                    </div>
                    {remarkOpen === student.id && (
                      <input
                        type="text"
                        value={m.remark}
                        onChange={(e) => setRemark(student.id, e.target.value)}
                        placeholder="Add remark (optional)"
                        style={{ marginTop: '6px', width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => handleSubmit(false)} disabled={submitting} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || counts.pending > 0}
                title={counts.pending > 0 ? `${counts.pending} students not yet marked` : ''}
                style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: counts.pending > 0 ? '#94a3b8' : '#1e3a8a', color: '#fff', fontWeight: 800, cursor: counts.pending > 0 ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Submitting…' : counts.pending > 0 ? `Submit (${counts.pending} pending)` : '✓ Submit Final'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Teachers Component ───────────────────────────────────────────────────
const Teachers = () => {
  const [activeModule, setActiveModule] = useState('timetable');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);
  const [submittedMarks, setSubmittedMarks] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const dayOfWeek = TODAY.getDay();
  const isWorkingDay = dayOfWeek !== 0 && !(dayOfWeek === 6 && ([2, 4].includes(Math.floor((TODAY.getDate() - 1) / 7) + 1)));

  const todayPeriods = useMemo(() => buildClassTimetable(TEACHER.classGrade, TEACHER.classDivision, dayOfWeek), [dayOfWeek]);

  const classStudents = useMemo(() =>
    SCHOOL_STUDENT_DIRECTORY
      .filter((s) => s.grade === TEACHER.classGrade && s.division === TEACHER.classDivision)
      .sort((a, b) => a.rollNo - b.rollNo),
  []);

  // First teaching period (not Assembly or Break)
  const firstPeriod = useMemo(() => todayPeriods.find((p) => p.type.startsWith('Period')), [todayPeriods]);

  const handleSubmitAttendance = (marks) => {
    setSubmittedMarks(marks);
    setAttendanceSubmitted(true);
  };

  const openAttendanceFor = (period) => {
    setSelectedPeriod(period);
    setShowAttendanceModal(true);
  };

  const tabs = [
    { key: 'timetable', label: '⏰ Today\'s Timetable' },
    { key: 'attendance', label: '✅ Attendance Records' },
    { key: 'links', label: '🔗 Quick Links' },
  ];

  const cardBase = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
  };

  const renderTimetable = () => (
    <div>
      <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: isWorkingDay ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isWorkingDay ? '#bbf7d0' : '#fde68a'}` }}>
        <strong style={{ color: isWorkingDay ? '#166534' : '#92400e' }}>{isWorkingDay ? '✅ Working Day' : '⚠ Holiday / Off Day'}</strong>
        <span style={{ marginLeft: '10px', color: isWorkingDay ? '#166534' : '#92400e', fontSize: '0.88rem' }}>{DAY_LABELS[dayOfWeek]}, {TODAY.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {!isWorkingDay ? (
        <div style={{ ...cardBase, textAlign: 'center', color: '#92400e' }}>No timetable for today — non-working day.</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {todayPeriods.map((period, idx) => {
            const isBreak = period.type.includes('Break') || period.type === 'Prayer & Assembly';
            const isFirst = period === firstPeriod;
            const isSubmitted = attendanceSubmitted && submittedMarks;

            const presentCount = isSubmitted ? Object.values(submittedMarks).filter((m) => m.status === 'present').length : 0;
            const absentCount = isSubmitted ? Object.values(submittedMarks).filter((m) => m.status === 'absent').length : 0;
            const lateCount = isSubmitted ? Object.values(submittedMarks).filter((m) => m.status === 'late').length : 0;

            return (
              <div
                key={idx}
                style={{ ...cardBase, borderLeft: `5px solid ${isBreak ? '#fcd34d' : period.type === 'Prayer & Assembly' ? '#60a5fa' : '#6366f1'}`, background: isFirst ? '#f0f9ff' : '#fff', borderColor: isFirst ? '#bae6fd' : '#e2e8f0' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{period.subject}</strong>
                      {isFirst && !isBreak && (
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>First Period</span>
                      )}
                      {isSubmitted && isFirst && (
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 700 }}>✓ Recorded</span>
                      )}
                    </div>
                    <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.82rem' }}>{period.type} · {period.time}</div>
                    {!isBreak && <div style={{ marginTop: '2px', color: '#475569', fontSize: '0.8rem' }}>Teacher: {period.teacher} · Room: {period.room}</div>}
                  </div>

                  {isFirst && !isBreak && (
                    <div>
                      {isSubmitted && submittedMarks ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem' }}>P: {presentCount}</span>
                          <span style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem' }}>A: {absentCount}</span>
                          {lateCount > 0 && <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem' }}>L: {lateCount}</span>}
                          <button type="button" onClick={() => openAttendanceFor(period)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAttendanceFor(period)}
                          style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(30,64,175,0.3)' }}
                        >
                          📋 Record Attendance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAttendanceRecords = () => {
    if (!attendanceSubmitted || !submittedMarks) {
      return (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b', padding: '32px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No attendance submitted yet for today.</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.86rem' }}>Use the Timetable tab to record first-period attendance.</p>
        </div>
      );
    }

    const entries = classStudents.map((s) => ({ ...s, mark: submittedMarks[s.id] || { status: '', remark: '' } }));
    const grouped = { present: entries.filter((e) => e.mark.status === 'present'), absent: entries.filter((e) => e.mark.status === 'absent'), late: entries.filter((e) => e.mark.status === 'late') };

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

        {[['Absent Students', grouped.absent, '#dc2626', '#fee2e2'], ['Late Arrivals', grouped.late, '#d97706', '#fef3c7']].map(([title, list, color, bg]) => list.length > 0 && (
          <div key={title} style={{ ...cardBase, marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 10px', color }}>{title} ({list.length})</h4>
            <div style={{ display: 'grid', gap: '6px' }}>
              {list.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: bg }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{e.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Roll {e.rollNo}{e.mark.remark ? ` · ${e.mark.remark}` : ''}</span>
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
        { title: 'Exams', desc: 'Assessment schedules and marks.', to: '/exams', color: '#b45309' },
        { title: 'Communication', desc: 'Send class circulars.', to: '/communication', color: '#7c3aed' },
      ].map((item) => (
        <a key={item.title} href={item.to} style={{ textDecoration: 'none', color: '#0f172a', ...cardBase, borderLeft: `5px solid ${item.color}` }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h3>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#475569' }}>{item.desc}</p>
        </a>
      ))}
    </div>
  );

  return (
    <main style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <section style={{ borderRadius: '16px', padding: '20px 24px', border: '1px solid #bfdbfe', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', boxShadow: '0 10px 22px rgba(30,64,175,0.1)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e3a8a', fontWeight: 800 }}>Teachers Portal</h2>
            <p style={{ margin: '6px 0 0', color: '#334155', fontSize: '0.9rem' }}>
              Welcome, <strong>{TEACHER.name}</strong> · Class Teacher, Grade {TEACHER.classGrade} {TEACHER.classDivisionLabel} · {classStudents.length} students
            </p>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: '12px', background: '#dbeafe', color: '#1e3a8a', fontWeight: 700, fontSize: '0.88rem' }}>
            {DAY_LABELS[dayOfWeek]}, {TODAY.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </section>

      {/* Tabs */}
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

      {/* Content */}
      {activeModule === 'timetable' && renderTimetable()}
      {activeModule === 'attendance' && renderAttendanceRecords()}
      {activeModule === 'links' && renderLinks()}

      {showAttendanceModal && selectedPeriod && (
        <AttendanceModal
          students={classStudents}
          period={selectedPeriod}
          onClose={() => setShowAttendanceModal(false)}
          onSubmit={handleSubmitAttendance}
        />
      )}
    </main>
  );
};

export default Teachers;
