import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const jsDayToApiDay = (jsDay) => (jsDay === 0 ? null : jsDay);

const PeriodDetails = () => {
  const { grade, division, periodIndex, date } = useParams();
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [dayPeriods, setDayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState({ classwork: '', homework: '', specialInstructions: '' });
  const [noteId, setNoteId] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const role = window.localStorage.getItem('smt-school-role');
  const canEdit = ['admin', 'principal', 'teacher'].includes(role);
  const canOverrideLock = ['admin', 'principal'].includes(role);
  // Teachers lose edit access once submitted/locked; admin/principal keep
  // theirs (mirrors attendance's PUT /:id lock check — same override rule),
  // but still get an Unlock button so they can hand editing back to the
  // teacher without having to make the correction themselves.
  const isReadOnly = !canEdit || (isLocked && !canOverrideLock);

  const loadPeriod = () => {
    setLoading(true);
    const dow = jsDayToApiDay(new Date(date).getDay());
    if (!dow) { setNotFound(true); setLoading(false); return; }

    Promise.all([
      api.get('/api/timetable', { grade, division, day: dow }),
      api.get('/api/period-notes', { grade, division, date }),
    ])
      .then(([timetableData, notesData]) => {
        const periods = timetableData.periods || [];
        const idx = Number(periodIndex);
        const found = periods.find((p) => p.periodIndex === idx);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setPeriod(found);
        setDayPeriods([...periods].sort((a, b) => a.periodIndex - b.periodIndex));

        const existingNote = (notesData.notes || []).find((n) => n.periodIndex === idx);
        if (existingNote) {
          setNote({
            classwork: existingNote.classwork || '',
            homework: existingNote.homework || '',
            specialInstructions: existingNote.specialInstructions || '',
          });
          setNoteId(existingNote.id);
          setAttachments(existingNote.attachments || []);
          setOpenCount(existingNote.openCount || 0);
          setIsLocked(!!existingNote.isLocked);
        } else {
          setNote({ classwork: '', homework: '', specialInstructions: '' });
          setNoteId(null);
          setAttachments([]);
          setOpenCount(0);
          setIsLocked(false);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  };

  useEffect(loadPeriod, [grade, division, periodIndex, date]);

  // Submit both saves and locks the note in one step (lock: true) — once
  // submitted, a teacher can no longer edit this period's update; only
  // admin/principal can (see isReadOnly above) or explicitly unlock it below.
  const saveNote = () => {
    setSaving(true);
    setSaveError('');
    api.put('/api/period-notes', { grade: Number(grade), division, date, periodIndex: Number(periodIndex), ...note, lock: true })
      .then((row) => { setNoteId(row.id); setIsLocked(!!row.isLocked); setSaving(false); })
      .catch((err) => { setSaveError(err.message || 'Failed to save.'); setSaving(false); });
  };

  const unlockNote = () => {
    setUnlocking(true);
    setSaveError('');
    api.post('/api/period-notes/unlock', { grade: Number(grade), division, date, periodIndex: Number(periodIndex) })
      .then(() => { setIsLocked(false); setUnlocking(false); })
      .catch((err) => { setSaveError(err.message || 'Failed to unlock.'); setUnlocking(false); });
  };

  // Accepts one or many files in a single pick — uploaded sequentially (the
  // uploads endpoint takes one file per request) so `attachments` grows by
  // exactly the files actually picked rather than racing parallel requests
  // against the same noteId. Attachments are linked by the note's row id, so
  // if the note hasn't been saved yet this silently creates it (unlocked —
  // the teacher hasn't hit Submit) before uploading, instead of making the
  // user save first.
  const handleUpload = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploading(true);
    setSaveError('');
    let currentNoteId = noteId;
    if (!currentNoteId) {
      try {
        const row = await api.put('/api/period-notes', { grade: Number(grade), division, date, periodIndex: Number(periodIndex), ...note, lock: false });
        currentNoteId = row.id;
        setNoteId(row.id);
        setIsLocked(!!row.isLocked);
      } catch (err) {
        setUploading(false);
        setSaveError(err.message || 'Failed to save note before attaching files.');
        return;
      }
    }
    const token = window.localStorage.getItem('smt-school-token');
    const failed = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('category', 'period-notes');
      formData.append('ownerType', 'period_note');
      formData.append('ownerId', currentNoteId);
      formData.append('file', file);
      try {
        const r = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
      } catch (err) {
        failed.push(`${file.name}: ${err.message || 'upload failed'}`);
      }
    }
    setUploading(false);
    if (failed.length) setSaveError(`Some files failed to attach — ${failed.join('; ')}`);
    loadPeriod();
    // Deferred, not synchronous — resetting a file input's value inside its
    // own onChange corrupts React's internal value-tracking for that
    // element, silently dropping the next native change event (attaching
    // more files in a row stops working). Let React finish first.
    const input = e.target;
    setTimeout(() => { input.value = ''; }, 0);
  };

  const backButtonStyle = {
    padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px',
    cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginBottom: '20px',
  };

  if (loading) {
    return <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}><div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading period details...</div></main>;
  }

  if (notFound || !period) {
    return (
      <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <section>
          <h2>Period Details</h2>
          <p style={{ color: '#64748b' }}>Invalid period link, or no period scheduled for that day. Please return to timetable.</p>
          <Link to="/timetable" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>← Back to Timetable</Link>
        </section>
      </main>
    );
  }

  const currentIdx = dayPeriods.findIndex((p) => p.periodIndex === Number(periodIndex));
  const prevPeriod = currentIdx > 0 ? dayPeriods[currentIdx - 1] : null;
  const nextPeriod = currentIdx >= 0 && currentIdx < dayPeriods.length - 1 ? dayPeriods[currentIdx + 1] : null;
  const goToPeriod = (p) => navigate(`/timetable/period/${grade}/${division}/${p.periodIndex}/${date}`);

  const detailStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' };
  const fieldStyle = { padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' };
  const textareaStyle = { width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '8px', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <section>
        <button type="button" onClick={() => navigate(-1)} style={{ ...backButtonStyle, background: '#0f766e', marginRight: '10px' }}>← Previous Menu</button>
        <Link to="/timetable" style={backButtonStyle}>← Back to Timetable</Link>
        <h2>Period Details</h2>
        <h3>Grade {grade} {division.charAt(0).toUpperCase() + division.slice(1)} · {period.type} · {formatDateDMY(date, { withWeekday: true })}</h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => prevPeriod && goToPeriod(prevPeriod)}
            disabled={!prevPeriod}
            style={{ flex: 1, minWidth: '160px', textAlign: 'left', padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: prevPeriod ? '#fff' : '#f8fafc', color: prevPeriod ? '#1e293b' : '#cbd5e1', cursor: prevPeriod ? 'pointer' : 'default', fontWeight: 600 }}
          >
            {prevPeriod ? <>← Previous: {prevPeriod.subject || prevPeriod.type}</> : '← Previous: none'}
          </button>
          <button
            type="button"
            onClick={() => nextPeriod && goToPeriod(nextPeriod)}
            disabled={!nextPeriod}
            style={{ flex: 1, minWidth: '160px', textAlign: 'right', padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: nextPeriod ? '#fff' : '#f8fafc', color: nextPeriod ? '#1e293b' : '#cbd5e1', cursor: nextPeriod ? 'pointer' : 'default', fontWeight: 600 }}
          >
            {nextPeriod ? <>Next: {nextPeriod.subject || nextPeriod.type} →</> : 'Next: none →'}
          </button>
        </div>

        <div style={detailStyle}>
          <div style={fieldStyle}><strong>Time:</strong> {period.time}</div>
          <div style={fieldStyle}><strong>Subject:</strong> {period.subject}</div>
          <div style={fieldStyle}><strong>Teacher:</strong> {period.teacherName || '—'}</div>
          <div style={fieldStyle}><strong>Room:</strong> {period.room || '—'}</div>
        </div>

        {period.type === 'Period' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Classwork, Homework &amp; Notes</h3>
              {canEdit && noteId && (
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700 }}>
                  👁 Opened by {openCount} parent{openCount === 1 ? '' : 's'}
                </span>
              )}
              {isLocked && (
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '0.78rem', fontWeight: 700 }}>
                  🔒 Submitted &amp; locked
                </span>
              )}
            </div>
            {isLocked && !canOverrideLock && (
              <p style={{ marginTop: '8px', color: '#92400e', fontSize: '0.85rem' }}>
                This update has been submitted and is locked. Ask an admin to unlock it if it needs a correction.
              </p>
            )}
            {isLocked && canOverrideLock && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '0.85rem' }}>Locked — you can still edit and re-submit, or unlock it for the teacher.</p>
                <button type="button" onClick={unlockNote} disabled={unlocking} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                  {unlocking ? 'Unlocking…' : '🔓 Unlock'}
                </button>
              </div>
            )}
            {saveError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</p>}
            <div style={detailStyle}>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Classwork</strong>
                {!isReadOnly ? (
                  <textarea style={textareaStyle} value={note.classwork} onChange={(e) => setNote({ ...note, classwork: e.target.value })} placeholder="What was covered in class today" />
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0 }}>{note.classwork || 'Not added yet.'}</p>
                )}
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Homework</strong>
                {!isReadOnly ? (
                  <textarea style={textareaStyle} value={note.homework} onChange={(e) => setNote({ ...note, homework: e.target.value })} placeholder="Homework assigned for this period" />
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0 }}>{note.homework || 'None assigned.'}</p>
                )}
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Special Instructions</strong>
                {!isReadOnly ? (
                  <textarea style={textareaStyle} value={note.specialInstructions} onChange={(e) => setNote({ ...note, specialInstructions: e.target.value })} placeholder="Anything parents/students should know" />
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0 }}>{note.specialInstructions || 'None.'}</p>
                )}
              </div>

              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Attachments</strong>
                <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                  {attachments.length === 0 && <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>No files attached.</p>}
                  {attachments.map((a) => (
                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.88rem' }}>{a.originalFilename}</a>
                  ))}
                </div>
                {!isReadOnly && (
                  <label style={{ display: 'inline-block', marginTop: '10px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {uploading ? 'Uploading…' : '+ Attach Files'}
                    <input type="file" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {!isReadOnly && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={saveNote} disabled={saving} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default PeriodDetails;
