import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import QuillTableBetter from 'quill-table-better';
import MagicUrl from 'quill-magic-url';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-table-better/dist/quill-table-better.css';
import { api } from '../api';

// react-quill-new bundles Quill 2.x directly (unlike the old react-quill,
// which was stuck on Quill 1.3.7) — quill-table-better is the Quill-2.x-native
// table module, replacing the earlier quill-better-table attempt that crashed
// the editor on mount due to a Quill 1.x/2.x version mismatch.
Quill.register({ 'modules/table-better': QuillTableBetter }, true);
Quill.register('modules/magicUrl', MagicUrl);

// If Quill/its modules ever throw on mount again, contain the blast radius to
// the message box instead of blanking the whole page (this is exactly the
// failure mode that hit production earlier today).
class EditorErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: '14px', background: '#fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>Message editor failed to load. Try refreshing the page; if it keeps happening, let the developer know.</div>;
    }
    return this.props.children;
  }
}

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
const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];

const EMPTY_AUDIENCE = {
  allGrades: false, grades: [],
  allDivisions: false, divisions: [],
  allTeachers: false, teacherIds: [],
  studentIds: [],
};
const EMPTY_FORM = {
  title: '', body: '', category: 'General', priority: 'Normal',
  eventDate: '', expiresAt: '', targetAudience: EMPTY_AUDIENCE,
};

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'], ['table-better'], ['clean'],
  ],
  table: false,
  'table-better': {
    language: 'en_US',
    menus: ['column', 'row', 'merge', 'table', 'cell', 'wrap', 'copy', 'delete'],
    toolbarTable: true,
  },
  keyboard: { bindings: QuillTableBetter.keyboardBindings },
  magicUrl: true,
};

// ── Audience picker — three independent, additive facets (Grade×Division,
// Teachers, Students) rather than a single mutually-exclusive mode. Divisions
// auto-default to "All" the moment a grade is first selected, so there's no
// separate commit step to forget (the earlier funnel required a "+ Add"
// click that silently produced empty-audience notices when skipped).
const AudiencePicker = ({ audience, onChange, inputStyle, labelStyle }) => {
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [studentGrade, setStudentGrade] = useState(3);
  const [studentDivision, setStudentDivision] = useState('alpha');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    if (audience.allTeachers) return;
    api.get('/api/staff', { category: 'Teaching', search: teacherSearch })
      .then((data) => setTeacherResults(data.staff || []))
      .catch(() => setTeacherResults([]));
  }, [audience.allTeachers, teacherSearch]);

  useEffect(() => {
    api.get('/api/students', { grade: studentGrade, division: studentDivision, search: studentSearch, limit: 40 })
      .then((data) => setStudentResults(data.students || []))
      .catch(() => setStudentResults([]));
  }, [studentGrade, studentDivision, studentSearch]);

  const maybeDefaultDivisions = (next) => {
    const gradeFacetActive = next.allGrades || next.grades.length > 0;
    if (gradeFacetActive && !next.allDivisions && next.divisions.length === 0) {
      return { ...next, allDivisions: true };
    }
    return next;
  };

  const toggleAllGrades = () => {
    const allGrades = !audience.allGrades;
    onChange(maybeDefaultDivisions({ ...audience, allGrades, grades: allGrades ? [] : audience.grades }));
  };
  const toggleGrade = (g) => {
    if (audience.allGrades) return;
    const grades = audience.grades.includes(g) ? audience.grades.filter((x) => x !== g) : [...audience.grades, g];
    onChange(maybeDefaultDivisions({ ...audience, grades }));
  };
  const toggleAllDivisions = () => {
    const allDivisions = !audience.allDivisions;
    onChange({ ...audience, allDivisions, divisions: allDivisions ? [] : audience.divisions });
  };
  const toggleDivision = (d) => {
    if (audience.allDivisions) return;
    const divisions = audience.divisions.includes(d) ? audience.divisions.filter((x) => x !== d) : [...audience.divisions, d];
    onChange({ ...audience, divisions });
  };
  const toggleAllTeachers = () => {
    const allTeachers = !audience.allTeachers;
    onChange({ ...audience, allTeachers, teacherIds: allTeachers ? [] : audience.teacherIds });
  };
  const addTeacher = (staffMember) => {
    if (audience.teacherIds.includes(staffMember.id)) return;
    onChange({ ...audience, teacherIds: [...audience.teacherIds, staffMember.id] });
    setSelectedTeachers((prev) => [...prev, { id: staffMember.id, name: staffMember.displayName || `${staffMember.firstName} ${staffMember.lastName}` }]);
  };
  const removeTeacher = (id) => {
    onChange({ ...audience, teacherIds: audience.teacherIds.filter((x) => x !== id) });
    setSelectedTeachers((prev) => prev.filter((t) => t.id !== id));
  };
  const addStudent = (student) => {
    if (audience.studentIds.includes(student.id)) return;
    onChange({ ...audience, studentIds: [...audience.studentIds, student.id] });
    setSelectedStudents((prev) => [...prev, { id: student.id, name: `${student.firstName} ${student.lastName}` }]);
  };
  const removeStudent = (id) => {
    onChange({ ...audience, studentIds: audience.studentIds.filter((x) => x !== id) });
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1e3a8a', fontSize: '0.78rem', fontWeight: 600, marginRight: '6px', marginBottom: '6px' };
  const pillStyle = (active, disabled) => ({ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: disabled ? '#94a3b8' : '#334155', background: active ? '#dbeafe' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 });
  const sectionTitleStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', marginTop: '4px' };

  const gradeFacetActive = audience.allGrades || audience.grades.length > 0;

  return (
    <div>
      <label style={labelStyle}>Audience — select any combination; the notice reaches the union of all selections below</label>

      <span style={sectionTitleStyle}>Grades &amp; Divisions</span>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <label style={pillStyle(audience.allGrades, false)}>
          <input type="checkbox" checked={audience.allGrades} onChange={toggleAllGrades} /> All Grades
        </label>
        {GRADES.map((g) => (
          <label key={g} style={pillStyle(audience.allGrades || audience.grades.includes(g), audience.allGrades)}>
            <input type="checkbox" checked={audience.allGrades || audience.grades.includes(g)} disabled={audience.allGrades} onChange={() => toggleGrade(g)} /> Grade {g}
          </label>
        ))}
      </div>
      {gradeFacetActive && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label style={pillStyle(audience.allDivisions, false)}>
            <input type="checkbox" checked={audience.allDivisions} onChange={toggleAllDivisions} /> All Divisions
          </label>
          {DIVISIONS.map((d) => (
            <label key={d} style={pillStyle(audience.allDivisions || audience.divisions.includes(d), audience.allDivisions)}>
              <input type="checkbox" checked={audience.allDivisions || audience.divisions.includes(d)} disabled={audience.allDivisions} onChange={() => toggleDivision(d)} /> {d}
            </label>
          ))}
        </div>
      )}

      <span style={sectionTitleStyle}>Teachers</span>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...pillStyle(audience.allTeachers, false), marginBottom: '8px' }}>
          <input type="checkbox" checked={audience.allTeachers} onChange={toggleAllTeachers} /> All Teachers
        </label>
        {!audience.allTeachers && (
          <div>
            <input style={{ ...inputStyle, width: '260px', marginBottom: '8px' }} placeholder="Search teacher name..." value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} />
            {teacherSearch.trim() && (
              <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                {teacherResults.map((t) => (
                  <div key={t.id} onClick={() => addTeacher(t)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', background: audience.teacherIds.includes(t.id) ? '#eff6ff' : '#fff' }}>
                    {t.displayName}
                  </div>
                ))}
                {teacherResults.length === 0 && <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>No teachers found.</div>}
              </div>
            )}
            <div>
              {selectedTeachers.map((t) => (
                <span key={t.id} style={chipStyle}>
                  {t.name}
                  <button type="button" onClick={() => removeTeacher(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontWeight: 800 }}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <span style={sectionTitleStyle}>Specific Students</span>
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
            <div key={s.id} onClick={() => addStudent(s)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', background: audience.studentIds.includes(s.id) ? '#eff6ff' : '#fff' }}>
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
    </div>
  );
};

const Communication = () => {
  const role = window.localStorage.getItem('smt-school-role');
  const canManage = role === 'admin' || role === 'principal' || role === 'teacher';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';

  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    api.get('/api/auth/me').then((data) => setCurrentUserId(data.user?.id)).catch(() => {});
  }, []);
  // Teachers can only edit/deactivate/delete notices they created themselves;
  // admin/principal can touch anything (mirrors the server-side check).
  const canModify = (notice) => isAdminOrPrincipal || notice.createdByUserId === currentUserId;

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [expiresAtTouched, setExpiresAtTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const handleEventDateChange = (value) => {
    setForm((f) => ({ ...f, eventDate: value, expiresAt: expiresAtTouched ? f.expiresAt : value }));
  };
  const handleExpiresAtChange = (value) => {
    setExpiresAtTouched(true);
    setForm((f) => ({ ...f, expiresAt: value }));
  };

  const loadNotices = () => {
    setLoading(true);
    api.get(canManage ? '/api/notices' : '/api/notices/mine', {})
      .then((data) => { setNotices(data.notices || []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadNotices, []);

  // Teachers see notice bodies immediately (no click-to-expand step like the
  // parent portal has), so mark them read as soon as the list loads — once
  // per notice id per page visit.
  const markedReadRef = useRef(new Set());
  useEffect(() => {
    if (canManage) return;
    notices.forEach((n) => {
      if (markedReadRef.current.has(n._id)) return;
      markedReadRef.current.add(n._id);
      api.post(`/api/notices/${n._id}/read`).catch(() => {});
    });
  }, [canManage, notices]);

  // Deep link from a push notification (/communication?noticeId=123) —
  // scroll straight to the notice instead of leaving the visitor to scan
  // the whole list for it.
  useEffect(() => {
    const noticeId = new URLSearchParams(window.location.search).get('noticeId');
    if (!noticeId || !notices.length) return;
    const el = document.getElementById(`notice-${noticeId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [notices]);

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

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setExpiresAtTouched(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (notice) => {
    setForm({
      title: notice.title,
      body: notice.body,
      category: notice.category,
      priority: notice.priority,
      eventDate: notice.eventDate ? notice.eventDate.slice(0, 10) : '',
      expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 10) : '',
      targetAudience: { ...EMPTY_AUDIENCE, ...(notice.targetAudience || {}) },
    });
    setExpiresAtTouched(true);
    setEditingId(notice._id);
    setSaveError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plainText = form.body.replace(/<[^>]*>/g, '').trim();
    if (!form.title.trim() || !plainText) {
      setSaveError('Title and message are required.');
      return;
    }
    const a = form.targetAudience;
    const hasGradeDivision = a.allGrades || a.grades.length > 0;
    const hasTeachers = a.allTeachers || a.teacherIds.length > 0;
    const hasStudents = a.studentIds.length > 0;
    if (!hasGradeDivision && !hasTeachers && !hasStudents) {
      setSaveError('Select at least one audience — grade/division, teachers, or specific students — before publishing.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        eventDate: form.eventDate || null,
        expiresAt: form.expiresAt || null,
      };
      if (editingId) {
        await api.put(`/api/notices/${editingId}`, payload);
      } else {
        await api.post('/api/notices', payload);
      }
      closeForm();
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
    const a = { ...EMPTY_AUDIENCE, ...(audience || {}) };
    const chips = [];
    if (a.allGrades || a.grades.length > 0) {
      const gradeLabel = a.allGrades ? 'All Grades' : `Grade ${a.grades.slice().sort((x, y) => x - y).join(',')}`;
      const divLabel = a.allDivisions ? 'All divisions' : a.divisions.join(',');
      chips.push(`${gradeLabel} · ${divLabel}`);
    }
    if (a.allTeachers) chips.push('All Teachers');
    else if (a.teacherIds.length > 0) chips.push(`${a.teacherIds.length} teacher(s)`);
    if (a.studentIds.length > 0) chips.push(`${a.studentIds.length} student(s)`);
    return chips.length ? chips : ['No audience selected'];
  };

  const displayNotices = activeTab === 'active' ? activeNotices : archivedNotices;

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Communication</h2>
            <p style={{ color: '#4b5563', marginTop: 0 }}>
              {canManage ? 'Send and manage announcements to parents, teachers, and staff.' : 'Announcements sent to you.'}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => { if (showForm) { closeForm(); } else { setSaveError(null); setShowForm(true); } }}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: showForm ? '#64748b' : '#1e40af', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {showForm ? '✕ Cancel' : '+ New Notice'}
            </button>
          )}
        </div>

        {canManage && showForm && (
          <form onSubmit={handleSubmit} style={{ ...cardStyle, marginTop: '18px', display: 'grid', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>{editingId ? 'Edit Notice' : 'New Notice'}</h3>
            <div>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. School closed for Diwali" />
            </div>
            <div>
              <label style={labelStyle}>Message *</label>
              <div style={{ overflowX: 'auto' }}>
                <EditorErrorBoundary>
                  <ReactQuill theme="snow" value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} modules={QUILL_MODULES} style={{ background: '#fff' }} />
                </EditorErrorBoundary>
              </div>
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
                <input type="date" style={inputStyle} value={form.eventDate} onChange={(e) => handleEventDateChange(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Show Until (optional)</label>
                <input type="date" style={inputStyle} value={form.expiresAt} onChange={(e) => handleExpiresAtChange(e.target.value)} />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Defaults to the Event Date, but you can pick a different one. Moves to Archived after this date — not deleted.</p>
              </div>
            </div>

            <AudiencePicker audience={form.targetAudience} onChange={(targetAudience) => setForm((f) => ({ ...f, targetAudience }))} inputStyle={inputStyle} labelStyle={labelStyle} />

            {saveError && <div style={{ color: '#991b1b', fontSize: '0.82rem' }}>{saveError}</div>}
            <div>
              <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? (editingId ? 'Saving...' : 'Publishing...') : (editingId ? 'Save Changes' : 'Publish Notice')}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '18px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['active', `Notices (${activeNotices.length})`], ['archived', `Archived (${archivedNotices.length})`]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} style={{ padding: '8px 16px', borderRadius: '999px', border: `1px solid ${activeTab === key ? '#1e40af' : '#cbd5e1'}`, background: activeTab === key ? '#1e40af' : '#fff', color: activeTab === key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
            {[['grid', '▦ Grid'], ['list', '☰ List']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setViewMode(key)} style={{ padding: '7px 14px', border: 'none', background: viewMode === key ? '#1e40af' : '#fff', color: viewMode === key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading notices...</div>}
        {error && <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b', marginTop: '16px' }}>Failed to load notices: {error}</div>}
        {!loading && !error && displayNotices.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No notices to show.</div>}

        {!loading && !error && displayNotices.length > 0 && viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {displayNotices.map((notice) => {
              const catStyle = CATEGORY_STYLE[notice.category] || CATEGORY_STYLE.General;
              return (
                <div id={`notice-${notice._id}`} key={notice._id} style={{ ...cardStyle, padding: '12px 16px', borderLeft: `4px solid ${catStyle.color}`, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', opacity: activeTab === 'archived' ? 0.7 : 1 }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: catStyle.bg, color: catStyle.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{notice.category}</span>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, flex: 1, minWidth: '160px' }}>{notice.title}</h3>
                  {notice.priority !== 'Normal' && (
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: (PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal).bg, color: (PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal).color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{notice.priority}</span>
                  )}
                  {!notice.isActive && <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Deactivated</span>}
                  <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>Published: {formatDate(notice.publishedAt)}</span>
                  {notice.eventDate && <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>Event: {formatDate(notice.eventDate)}</span>}
                  {canManage && <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>👥 {notice.reachCount ?? 0} · 👁 {notice.openCount ?? 0}</span>}
                  {canModify(notice) && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => handleEdit(notice)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e40af', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>
                      <button type="button" onClick={() => handleDeactivate(notice)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{notice.isActive ? 'Deactivate' : 'Reactivate'}</button>
                      <button type="button" onClick={() => handleDelete(notice)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && displayNotices.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {displayNotices.map((notice) => {
              const catStyle = CATEGORY_STYLE[notice.category] || CATEGORY_STYLE.General;
              const priStyle = PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal;
              return (
                <div id={`notice-${notice._id}`} key={notice._id} style={{ ...cardStyle, borderLeft: `4px solid ${catStyle.color}`, opacity: activeTab === 'archived' ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: '700', flex: 1 }}>{notice.title}</h3>
                    {notice.priority !== 'Normal' && (
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: priStyle.bg, color: priStyle.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{notice.priority}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: catStyle.bg, color: catStyle.color, fontSize: '0.72rem', fontWeight: 700 }}>{notice.category}</span>
                    {canManage && audienceSummary(notice.targetAudience).map((label, i) => (
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
                  {canManage && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                      👥 Reached: {notice.reachCount ?? 0} · 👁 Opened: {notice.openCount ?? 0}
                    </div>
                  )}
                  {canModify(notice) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button type="button" onClick={() => handleEdit(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e40af', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDeactivate(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                        {notice.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button type="button" onClick={() => handleDelete(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  )}
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
