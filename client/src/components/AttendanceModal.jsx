import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const DIVISION_LABEL = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };
const STATUS_COLORS = { Present: '#16a34a', Absent: '#dc2626', Late: '#d97706', '': '#94a3b8' };
const STATUS_BG = { Present: '#dcfce7', Absent: '#fee2e2', Late: '#fef3c7', '': '#f1f5f9' };

// Shared by Teachers.jsx (Attendance Records tab) and Timetable.jsx (Full
// Timetable) — recording attendance works the same way regardless of which
// screen a teacher got here from.
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
              <strong>Dates:</strong> {viewLeaveFor.leaveRequest.fromDate === viewLeaveFor.leaveRequest.toDate ? formatDateDMY(viewLeaveFor.leaveRequest.fromDate) : `${formatDateDMY(viewLeaveFor.leaveRequest.fromDate)} → ${formatDateDMY(viewLeaveFor.leaveRequest.toDate)}`}
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

export default AttendanceModal;
