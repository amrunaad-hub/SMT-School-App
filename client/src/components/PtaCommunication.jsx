import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const DIVISIONS = ['alpha', 'beta', 'gamma'];

const cardStyle = { padding: '16px', border: '1px solid #fecdd3', borderRadius: '12px', background: '#fff' };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' };
const btnStyle = { padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#e11d48', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' };

// A scoped-down sibling of Communication.jsx for parents who additionally
// hold a PTA or class-rep designation (server/utils/representatives.js).
// Deliberately a plain textarea rather than the Quill rich-text editor used
// by the staff Communication module — reps sending short circulars didn't
// need the full formatting/attachment surface, and it avoids a second Quill
// bundle just for this. Audience is expressed via the same targetAudience
// shape POST /api/notices already understands (gradeSelections/studentIds);
// the server independently re-validates it stays inside the rep's scope
// (server/routes/notices.js validateRepAudience), so a tampered request
// still can't reach outside the rep's grade/division.
const PtaCommunication = ({ scope }) => {
  const allowedGradeDivisions = useMemo(() => {
    const byGrade = {};
    if (scope.isPta && scope.ptaGrade) byGrade[scope.ptaGrade] = { grade: scope.ptaGrade, allDivisions: true, divisions: DIVISIONS.slice() };
    (scope.classRepScopes || []).forEach(({ grade, division }) => {
      if (byGrade[grade]?.allDivisions) return;
      if (!byGrade[grade]) byGrade[grade] = { grade, allDivisions: false, divisions: [] };
      if (!byGrade[grade].divisions.includes(division)) byGrade[grade].divisions.push(division);
    });
    return Object.values(byGrade);
  }, [scope]);

  const [grade, setGrade] = useState(allowedGradeDivisions[0]?.grade);
  const activeScope = allowedGradeDivisions.find((s) => s.grade === grade) || allowedGradeDivisions[0];

  const [mode, setMode] = useState('all'); // 'all' | 'divisions' | 'students'
  const [divisions, setDivisions] = useState(activeScope?.divisions || []);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDivision, setStudentDivision] = useState(activeScope?.divisions?.[0] || 'alpha');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    setMode(activeScope?.allDivisions ? 'all' : 'divisions');
    setDivisions(activeScope?.divisions || []);
    setStudentDivision(activeScope?.divisions?.[0] || 'alpha');
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'students' || !grade) return;
    api.get('/api/students', { grade, division: studentDivision, search: studentSearch, limit: 40 })
      .then((data) => setStudentResults(data.students || []))
      .catch(() => setStudentResults([]));
  }, [mode, grade, studentDivision, studentSearch]);

  const [form, setForm] = useState({ title: '', body: '', priority: 'Normal' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [sent, setSent] = useState([]);
  const [loadingSent, setLoadingSent] = useState(true);

  const loadSent = () => {
    setLoadingSent(true);
    api.get('/api/notices/sent').then((data) => setSent(data.notices || [])).catch(() => {}).finally(() => setLoadingSent(false));
  };
  useEffect(loadSent, []);

  const toggleDivision = (d) => setDivisions((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const addStudent = (s) => {
    if (selectedStudents.some((x) => x.id === s.id)) return;
    setSelectedStudents((prev) => [...prev, { id: s.id, name: `${s.firstName} ${s.lastName}` }]);
  };
  const removeStudent = (id) => setSelectedStudents((prev) => prev.filter((s) => s.id !== id));

  const resetForm = () => {
    setForm({ title: '', body: '', priority: 'Normal' });
    setSelectedStudents([]);
    setSaveError(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setSaveError('Title and message are required.');
      return;
    }
    let targetAudience;
    if (mode === 'students') {
      if (selectedStudents.length === 0) {
        setSaveError('Pick at least one parent to send to.');
        return;
      }
      targetAudience = { allGrades: false, gradeSelections: [], allTeachers: false, teacherIds: [], studentIds: selectedStudents.map((s) => s.id) };
    } else {
      const allDivisions = mode === 'all';
      if (!allDivisions && divisions.length === 0) {
        setSaveError('Pick at least one division.');
        return;
      }
      targetAudience = {
        allGrades: false,
        gradeSelections: [{ grade, allDivisions, divisions: allDivisions ? [] : divisions }],
        allTeachers: false, teacherIds: [], studentIds: [],
      };
    }

    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/api/notices', { title: form.title, body: form.body, category: 'General', priority: form.priority, targetAudience });
      resetForm();
      loadSent();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(`Delete "${notice.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/notices/${notice._id}`);
      loadSent();
    } catch (err) {
      window.alert(err.message);
    }
  };

  if (allowedGradeDivisions.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>PTA / Class Rep Communication</h3>
          <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '0.85rem' }}>
            Send a message to parents in {scope.isPta ? `Grade ${scope.ptaGrade}` : 'your division'}.
          </p>
        </div>
        <button type="button" onClick={() => (showForm ? resetForm() : setShowForm(true))} style={{ ...btnStyle, background: showForm ? '#64748b' : '#e11d48' }}>
          {showForm ? '✕ Cancel' : '+ New Message'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'grid', gap: '12px' }}>
          {allowedGradeDivisions.length > 1 && (
            <div>
              <label style={labelStyle}>Grade</label>
              <select style={inputStyle} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {allowedGradeDivisions.map((s) => <option key={s.grade} value={s.grade}>Grade {s.grade}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. PTA meeting on Saturday" />
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select style={{ ...inputStyle, width: 'auto' }} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {['Normal', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Send to</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {activeScope?.allDivisions && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                  <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> All divisions
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                <input type="radio" checked={mode === 'divisions'} onChange={() => setMode('divisions')} /> Specific division(s)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                <input type="radio" checked={mode === 'students'} onChange={() => setMode('students')} /> Specific parents
              </label>
            </div>

            {mode === 'divisions' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(activeScope?.divisions || []).map((d) => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', padding: '5px 10px', borderRadius: '999px', background: divisions.includes(d) ? '#ffe4e6' : '#f1f5f9' }}>
                    <input type="checkbox" checked={divisions.includes(d)} onChange={() => toggleDivision(d)} /> {d}
                  </label>
                ))}
              </div>
            )}

            {mode === 'students' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <select style={{ ...inputStyle, width: 'auto' }} value={studentDivision} onChange={(e) => setStudentDivision(e.target.value)}>
                    {(activeScope?.divisions || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input style={{ ...inputStyle, width: '220px' }} placeholder="Search student name..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                  {studentResults.map((s) => (
                    <div key={s.id} onClick={() => addStudent(s)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', background: selectedStudents.some((x) => x.id === s.id) ? '#eff6ff' : '#fff' }}>
                      {s.firstName} {s.lastName} · Roll {s.rollNo}
                    </div>
                  ))}
                  {studentResults.length === 0 && <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>No students found.</div>}
                </div>
                {selectedStudents.map((s) => (
                  <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1e3a8a', fontSize: '0.78rem', fontWeight: 600, marginRight: '6px', marginBottom: '6px' }}>
                    {s.name}
                    <button type="button" onClick={() => removeStudent(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontWeight: 800 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Message *</label>
            <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Type your message..." />
          </div>

          {saveError && <div style={{ color: '#991b1b', fontSize: '0.82rem' }}>{saveError}</div>}
          <div>
            <button type="submit" disabled={saving} style={{ ...btnStyle, background: '#10b981', opacity: saving ? 0.7 : 1 }}>{saving ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      )}

      <div>
        <h4 style={{ color: '#0f172a', margin: '0 0 8px' }}>Your Sent Messages</h4>
        {loadingSent && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading...</div>}
        {!loadingSent && sent.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>You haven't sent anything yet.</div>}
        <div style={{ display: 'grid', gap: '8px' }}>
          {sent.map((n) => (
            <div key={n._id} style={{ ...cardStyle, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{formatDateDMY(n.publishedAt)} · Reached {n.reachCount ?? 0}</div>
              </div>
              <button type="button" onClick={() => handleDelete(n)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PtaCommunication;
