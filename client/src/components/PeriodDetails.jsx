import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const jsDayToApiDay = (jsDay) => (jsDay === 0 ? null : jsDay);

const PeriodDetails = () => {
  const { grade, division, periodIndex, date } = useParams();
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState({ classwork: '', homework: '', specialInstructions: '' });
  const [noteId, setNoteId] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);

  const role = window.sessionStorage.getItem('smt-school-role');
  const canEdit = ['admin', 'principal', 'teacher'].includes(role);

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
        } else {
          setNote({ classwork: '', homework: '', specialInstructions: '' });
          setNoteId(null);
          setAttachments([]);
          setOpenCount(0);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  };

  useEffect(loadPeriod, [grade, division, periodIndex, date]);

  const saveNote = () => {
    setSaving(true);
    setSaveError('');
    api.put('/api/period-notes', { grade: Number(grade), division, date, periodIndex: Number(periodIndex), ...note })
      .then((row) => { setNoteId(row.id); setSaving(false); })
      .catch((err) => { setSaveError(err.message || 'Failed to save.'); setSaving(false); });
  };

  const handleUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !noteId) { setSaveError('Save the note first, then attach a file.'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('category', 'period-notes');
    formData.append('ownerType', 'period_note');
    formData.append('ownerId', noteId);
    formData.append('file', file);
    const token = window.sessionStorage.getItem('smt-school-token');
    fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      .then((r) => r.json().then((data) => { if (!r.ok) throw new Error(data.message); return data; }))
      .then(() => { setUploading(false); loadPeriod(); })
      .catch((err) => { setUploading(false); setSaveError(err.message || 'Upload failed.'); });
    e.target.value = '';
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
            </div>
            {saveError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</p>}
            <div style={detailStyle}>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Classwork</strong>
                {canEdit ? (
                  <textarea style={textareaStyle} value={note.classwork} onChange={(e) => setNote({ ...note, classwork: e.target.value })} placeholder="What was covered in class today" />
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0 }}>{note.classwork || 'Not added yet.'}</p>
                )}
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Homework</strong>
                {canEdit ? (
                  <textarea style={textareaStyle} value={note.homework} onChange={(e) => setNote({ ...note, homework: e.target.value })} placeholder="Homework assigned for this period" />
                ) : (
                  <p style={{ marginTop: '8px', marginBottom: 0 }}>{note.homework || 'None assigned.'}</p>
                )}
              </div>
              <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                <strong>Special Instructions</strong>
                {canEdit ? (
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
                {canEdit && (
                  <label style={{ display: 'inline-block', marginTop: '10px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {uploading ? 'Uploading…' : (noteId ? '+ Attach File' : 'Save note first to attach files')}
                    <input type="file" onChange={handleUpload} disabled={uploading || !noteId} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            {canEdit && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={saveNote} disabled={saving} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Save Notes'}
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
