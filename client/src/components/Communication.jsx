import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';
import { api } from '../api';

const CATEGORY_STYLE = {
  General: { bg: '#f1f5f9', color: '#475569' },
  Academic: { bg: '#dbeafe', color: '#1e3a8a' },
  Fee: { bg: '#fef3c7', color: '#92400e' },
  Event: { bg: '#f3e8ff', color: '#6b21a8' },
  Holiday: { bg: '#dcfce7', color: '#166534' },
  Exam: { bg: '#fce7f3', color: '#9d174d' },
  Urgent: { bg: '#fee2e2', color: '#991b1b' },
};

const PRIORITY_STYLE = {
  Normal: { bg: '#f1f5f9', color: '#475569' },
  High: { bg: '#fef3c7', color: '#92400e' },
  Urgent: { bg: '#fee2e2', color: '#991b1b' },
};

const CATEGORIES = Object.keys(CATEGORY_STYLE);
const ROLES = ['parents', 'teachers', 'students', 'staff'];
const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const AUDIENCE_MODES = [
  { key: 'all', label: 'All' },
  { key: 'role', label: 'By Role' },
  { key: 'grade', label: 'By Grade' },
  { key: 'house', label: 'By House' },
  { key: 'gradeDivision', label: 'By Grade & Division' },
  { key: 'students', label: 'Specific Students' },
];

const EMPTY_AUDIENCE = { mode: 'all', roles: [], grades: [], houseIds: [], gradeDivisions: [], studentIds: [] };
const EMPTY_FORM = {
  title: '', body: '', category: 'General', priority: 'Normal',
  eventDate: '', expiresAt: '', targetAudience: EMPTY_AUDIENCE,
};

const QUILL_MODULES = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] };

// ── Audience funnel picker ────────────────────────────────────────────────────
const AudiencePicker = ({ audience, onChange, houses, inputStyle, labelStyle }) => {
  const [gdGrade, setGdGrade] = useState(3);
  const [gdDivisions, setGdDivisions] = useState([]);
  const [studentGrade, setStudentGrade] = useState(3);
  const [studentDivision, setStudentDivision] = useState('alpha');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    if (audience.mode !== 'students') return;
    api.get('/api/students', { grade: studentGrade, division: studentDivision, search: studentSearch, limit: 40 })
      .then((data) => setStudentResults(data.students || []))
      .catch(() => setStudentResults([]));
  }, [audience.mode, studentGrade, studentDivision, studentSearch]);

  const setMode = (mode) => onChange({ ...EMPTY_AUDIENCE, mode });

  const toggleRole = (role) => {
    const roles = audience.roles.includes(role) ? audience.roles.filter((r) => r !== role) : [...audience.roles, role];
    onChange({ ...audience, roles });
  };
  const toggleGrade = (g) => {
    const grades = audience.grades.includes(g) ? audience.grades.filter((x) => x !== g) : [...audience.grades, g];
    onChange({ ...audience, grades });
  };
  const toggleHouse = (id) => {
    const houseIds = audience.houseIds.includes(id) ? audience.houseIds.filter((x) => x !== id) : [...audience.houseIds, id];
    onChange({ ...audience, houseIds });
  };
  const addGradeDivisions = () => {
    if (gdDivisions.length === 0) return;
    const additions = gdDivisions.map((division) => ({ grade: gdGrade, division }));
    const existing = audience.gradeDivisions.filter((gd) => !(gd.grade === gdGrade && gdDivisions.includes(gd.division)));
    onChange({ ...audience, gradeDivisions: [...existing, ...additions] });
    setGdDivisions([]);
  };
  const removeGradeDivision = (grade, division) => {
    onChange({ ...audience, gradeDivisions: audience.gradeDivisions.filter((gd) => !(gd.grade === grade && gd.division === division)) });
  };
  const addStudent = (student) => {
    if (audience.studentIds.includes(student._id)) return;
    onChange({ ...audience, studentIds: [...audience.studentIds, student._id] });
    setSelectedStudents((prev) => [...prev, { id: student._id, name: `${student.firstName} ${student.lastName}` }]);
  };
  const removeStudent = (id) => {
    onChange({ ...audience, studentIds: audience.studentIds.filter((x) => x !== id) });
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1e3a8a', fontSize: '0.78rem', fontWeight: 600, marginRight: '6px', marginBottom: '6px' };
  const modeBtnStyle = (active) => ({ padding: '7px 14px', borderRadius: '999px', border: `1px solid ${active ? '#1e40af' : '#cbd5e1'}`, background: active ? '#1e40af' : '#fff', color: active ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' });

  return (
    <div>
      <label style={labelStyle}>Audience</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {AUDIENCE_MODES.map((m) => (
          <button key={m.key} type="button" onClick={() => setMode(m.key)} style={modeBtnStyle(audience.mode === m.key)}>{m.label}</button>
        ))}
      </div>

      {audience.mode === 'role' && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {ROLES.map((r) => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155', background: audience.roles.includes(r) ? '#dbeafe' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer' }}>
              <input type="checkbox" checked={audience.roles.includes(r)} onChange={() => toggleRole(r)} /> {r}
            </label>
          ))}
        </div>
      )}

      {audience.mode === 'grade' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {GRADES.map((g) => (
            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155', background: audience.grades.includes(g) ? '#dbeafe' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer' }}>
              <input type="checkbox" checked={audience.grades.includes(g)} onChange={() => toggleGrade(g)} /> Grade {g}
            </label>
          ))}
        </div>
      )}

      {audience.mode === 'house' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {houses.map((h) => (
            <label key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155', background: audience.houseIds.includes(h.id) ? '#dbeafe' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer' }}>
              <input type="checkbox" checked={audience.houseIds.includes(h.id)} onChange={() => toggleHouse(h.id)} /> {h.name}
            </label>
          ))}
        </div>
      )}

      {audience.mode === 'gradeDivision' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
            <select style={{ ...inputStyle, width: 'auto' }} value={gdGrade} onChange={(e) => setGdGrade(Number(e.target.value))}>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            {DIVISIONS.map((d) => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                <input type="checkbox" checked={gdDivisions.includes(d)} onChange={() => setGdDivisions((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])} /> {d}
              </label>
            ))}
            <button type="button" onClick={addGradeDivisions} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #1e40af', background: '#eff6ff', color: '#1e40af', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>+ Add</button>
          </div>
          <div>
            {audience.gradeDivisions.map((gd) => (
              <span key={`${gd.grade}-${gd.division}`} style={chipStyle}>
                Grade {gd.grade} {gd.division}
                <button type="button" onClick={() => removeGradeDivision(gd.grade, gd.division)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontWeight: 800 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {audience.mode === 'students' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <select style={{ ...inputStyle, width: 'auto' }} value={studentGrade} onChange={(e) => setStudentGrade(Number(e.target.value))}>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select style={{ ...inputStyle, width: 'auto' }} value={studentDivision} onChange={(e) => setStudentDivision(e.target.value)}>
              {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input style={{ ...inputStyle, width: '200px' }} placeholder="Search name..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
            {studentResults.map((s) => (
              <div key={s._id} onClick={() => addStudent(s)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', background: audience.studentIds.includes(s._id) ? '#eff6ff' : '#fff' }}>
                {s.firstName} {s.lastName} · Roll {s.rollNo}
              </div>
            ))}
            {studentResults.length === 0 && <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>No students found.</div>}
          </div>
          <div>
            {selectedStudents.map((s) => (
              <span key={s.id} style={chipStyle}>
                {s.name}
                <button type="button" onClick={() => removeStudent(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontWeight: 800 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Communication = () => {
  const [notices, setNotices] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadNotices = () => {
    setLoading(true);
    api.get('/api/notices', {})
      .then((data) => { setNotices(data.notices || []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadNotices, []);
  useEffect(() => { api.get('/api/houses').then((d) => setHouses(d.houses || [])).catch(() => {}); }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const { activeNotices, archivedNotices } = useMemo(() => {
    const active = [];
    const archived = [];
    notices.forEach((n) => {
      const expired = n.expiresAt && n.expiresAt.slice(0, 10) < todayStr;
      if (expired || !n.isActive) archived.push(n); else active.push(n);
    });
    return { activeNotices: active, archivedNotices: archived };
  }, [notices, todayStr]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const plainText = form.body.replace(/<[^>]*>/g, '').trim();
    if (!form.title.trim() || !plainText) {
      setSaveError('Title and message are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/api/notices', {
        ...form,
        eventDate: form.eventDate || null,
        expiresAt: form.expiresAt || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadNotices();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (notice) => {
    try {
      await api.put(`/api/notices/${notice._id}`, { isActive: !notice.isActive });
      loadNotices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(`Delete notice "${notice.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/notices/${notice._id}`);
      loadNotices();
    } catch (err) {
      setError(err.message);
    }
  };

  const cardStyle = { padding: '20px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', color: 'inherit' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' };

  const audienceSummary = (audience) => {
    if (!audience || audience.mode === 'all') return ['all'];
    if (audience.mode === 'role') return audience.roles.length ? audience.roles : ['role: none selected'];
    if (audience.mode === 'grade') return audience.grades.map((g) => `Grade ${g}`);
    if (audience.mode === 'house') return houses.filter((h) => audience.houseIds.includes(h.id)).map((h) => h.name);
    if (audience.mode === 'gradeDivision') return audience.gradeDivisions.map((gd) => `G${gd.grade} ${gd.division}`);
    if (audience.mode === 'students') return [`${audience.studentIds.length} student(s)`];
    return ['all'];
  };

  const displayNotices = activeTab === 'active' ? activeNotices : archivedNotices;

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Communication</h2>
            <p style={{ color: '#4b5563', marginTop: 0 }}>Send and manage announcements to parents, teachers, and staff.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setSaveError(null); }}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: showForm ? '#64748b' : '#1e40af', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {showForm ? '✕ Cancel' : '+ New Notice'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ ...cardStyle, marginTop: '18px', display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. School closed for Diwali" />
            </div>
            <div>
              <label style={labelStyle}>Message *</label>
              <ReactQuill theme="snow" value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} modules={QUILL_MODULES} style={{ background: '#fff' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {Object.keys(PRIORITY_STYLE).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Event / Important Date (optional)</label>
                <input type="date" style={inputStyle} value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Show Until (optional)</label>
                <input type="date" style={inputStyle} value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Moves to Archived after this date — not deleted.</p>
              </div>
            </div>

            <AudiencePicker audience={form.targetAudience} onChange={(targetAudience) => setForm((f) => ({ ...f, targetAudience }))} houses={houses} inputStyle={inputStyle} labelStyle={labelStyle} />

            {saveError && <div style={{ color: '#991b1b', fontSize: '0.82rem' }}>{saveError}</div>}
            <div>
              <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '18px', marginBottom: '4px' }}>
          {[['active', `Notices (${activeNotices.length})`], ['archived', `Archived (${archivedNotices.length})`]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} style={{ padding: '8px 16px', borderRadius: '999px', border: `1px solid ${activeTab === key ? '#1e40af' : '#cbd5e1'}`, background: activeTab === key ? '#1e40af' : '#fff', color: activeTab === key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading notices...</div>}
        {error && <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b', marginTop: '16px' }}>Failed to load notices: {error}</div>}
        {!loading && !error && displayNotices.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No notices to show.</div>}

        {!loading && !error && displayNotices.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {displayNotices.map((notice) => {
              const catStyle = CATEGORY_STYLE[notice.category] || CATEGORY_STYLE.General;
              const priStyle = PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal;
              return (
                <div key={notice._id} style={{ ...cardStyle, borderLeft: `4px solid ${catStyle.color}`, opacity: activeTab === 'archived' ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: '700', flex: 1 }}>{notice.title}</h3>
                    {notice.priority !== 'Normal' && (
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: priStyle.bg, color: priStyle.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{notice.priority}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: catStyle.bg, color: catStyle.color, fontSize: '0.72rem', fontWeight: 700 }}>{notice.category}</span>
                    {audienceSummary(notice.targetAudience).map((label, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 600 }}>{label}</span>
                    ))}
                    {!notice.isActive && <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700 }}>Deactivated</span>}
                  </div>
                  <div
                    style={{ margin: '0 0 10px', color: '#475569', fontSize: '0.84rem', lineHeight: 1.55, maxHeight: '4.6em', overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notice.body) }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <span>Published: {formatDate(notice.publishedAt)}</span>
                    {notice.eventDate && <span>Event: {formatDate(notice.eventDate)}</span>}
                    {notice.expiresAt && <span>Until: {formatDate(notice.expiresAt)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => handleDeactivate(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                      {notice.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button type="button" onClick={() => handleDelete(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Communication;
