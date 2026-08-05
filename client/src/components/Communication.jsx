import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import QuillTableBetter from 'quill-table-better';
import MagicUrl from 'quill-magic-url';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-table-better/dist/quill-table-better.css';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

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
  allGrades: false,
  // gradeSelections: [{ grade, allDivisions, divisions }] — replaces the old
  // flat grades[]/divisions[]/allDivisions, which applied one shared division
  // set across every selected grade (a cross-product) and couldn't express
  // "Grade 3 Alpha+Beta, Grade 4 all divisions" in a single notice. Old
  // notices still carry the flat shape; server-side matching falls back to
  // it when gradeSelections is empty (see server/utils/noticeAudience.js).
  gradeSelections: [],
  allTeachers: false, teacherIds: [],
  studentIds: [],
};

// Converts an existing notice's audience (possibly the old flat
// grades[]/divisions[]/allDivisions shape) into gradeSelections, so editing
// an older notice doesn't silently blow away its grade/division targeting.
const migrateAudienceForEdit = (audience) => {
  const a = { ...EMPTY_AUDIENCE, ...(audience || {}) };
  if (a.gradeSelections && a.gradeSelections.length > 0) return a;
  if (!a.allGrades && Array.isArray(a.grades) && a.grades.length > 0) {
    return {
      ...a,
      gradeSelections: a.grades.map((grade) => ({
        grade,
        allDivisions: !!a.allDivisions,
        divisions: a.allDivisions ? [] : (a.divisions || []).slice(),
      })),
    };
  }
  return a;
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
  const [teacherBrowseMode, setTeacherBrowseMode] = useState(true);
  const [teacherGrade, setTeacherGrade] = useState(3);
  const [teacherDivision, setTeacherDivision] = useState('alpha');
  const [showIndividualTeacherPicker, setShowIndividualTeacherPicker] = useState(false);
  // Full unfiltered roster (with classAssignments/currentClassTeacherOf),
  // fetched once — powers the bulk preset buttons below, independent of the
  // search/browse-driven teacherResults used by the individual picker.
  const [allTeachersFull, setAllTeachersFull] = useState([]);
  const [presetGrade, setPresetGrade] = useState(3);
  const [studentGrade, setStudentGrade] = useState(3);
  const [studentDivision, setStudentDivision] = useState('alpha');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showStudentPicker, setShowStudentPicker] = useState(audience.studentIds.length > 0);

  useEffect(() => {
    api.get('/api/staff', { category: 'Teaching' })
      .then((data) => setAllTeachersFull(data.staff || []))
      .catch(() => setAllTeachersFull([]));
  }, []);

  useEffect(() => {
    if (audience.allTeachers || !showIndividualTeacherPicker) return;
    api.get('/api/staff', { category: 'Teaching', search: teacherBrowseMode ? '' : teacherSearch })
      .then((data) => setTeacherResults(data.staff || []))
      .catch(() => setTeacherResults([]));
  }, [audience.allTeachers, teacherSearch, teacherBrowseMode, showIndividualTeacherPicker]);

  // In "browse by class" mode, only teachers actually assigned to (or the
  // class teacher of) the selected grade+division — mirrors the Specific
  // Students picker below instead of the old name-search-only flow.
  const visibleTeacherResults = teacherBrowseMode
    ? teacherResults.filter((t) => (
      (t.classAssignments || []).some((c) => c.grade === teacherGrade && c.division === teacherDivision)
      || (t.currentClassTeacherOf || []).some((c) => c.grade === teacherGrade && c.division === teacherDivision)
    ))
    : teacherResults;

  useEffect(() => {
    api.get('/api/students', { grade: studentGrade, division: studentDivision, search: studentSearch, limit: 40 })
      .then((data) => setStudentResults(data.students || []))
      .catch(() => setStudentResults([]));
  }, [studentGrade, studentDivision, studentSearch]);

  const toggleAllGrades = () => {
    const allGrades = !audience.allGrades;
    onChange({ ...audience, allGrades, gradeSelections: allGrades ? [] : audience.gradeSelections });
  };
  // Selecting a grade defaults it to "all divisions" immediately — no
  // separate commit step to forget (the earlier funnel had exactly that
  // failure: a selection never added to the array silently published to
  // nobody). Narrowing to specific divisions is an explicit extra step.
  const toggleGrade = (g) => {
    if (audience.allGrades) return;
    const exists = audience.gradeSelections.some((gs) => gs.grade === g);
    const gradeSelections = exists
      ? audience.gradeSelections.filter((gs) => gs.grade !== g)
      : [...audience.gradeSelections, { grade: g, allDivisions: true, divisions: [] }];
    onChange({ ...audience, gradeSelections });
  };
  const toggleGradeAllDivisions = (g) => {
    onChange({
      ...audience,
      gradeSelections: audience.gradeSelections.map((gs) => (
        gs.grade === g ? { ...gs, allDivisions: !gs.allDivisions, divisions: [] } : gs
      )),
    });
  };
  const toggleGradeDivision = (g, d) => {
    onChange({
      ...audience,
      gradeSelections: audience.gradeSelections.map((gs) => {
        if (gs.grade !== g) return gs;
        const divisions = gs.divisions.includes(d) ? gs.divisions.filter((x) => x !== d) : [...gs.divisions, d];
        return { ...gs, divisions };
      }),
    });
  };
  const toggleAllTeachers = () => {
    const allTeachers = !audience.allTeachers;
    onChange({ ...audience, allTeachers, teacherIds: allTeachers ? [] : audience.teacherIds });
  };
  const bulkAddTeachers = (matched) => {
    const newOnes = matched.filter((t) => !audience.teacherIds.includes(t.id));
    if (newOnes.length === 0) return;
    onChange({ ...audience, teacherIds: [...audience.teacherIds, ...newOnes.map((t) => t.id)] });
    setSelectedTeachers((prev) => [...prev, ...newOnes.map((t) => ({ id: t.id, name: t.displayName }))]);
  };
  const addAllClassTeachers = () => bulkAddTeachers(allTeachersFull.filter((t) => (t.currentClassTeacherOf || []).length > 0));
  const addClassTeachersOfGrade = (g) => bulkAddTeachers(allTeachersFull.filter((t) => (t.currentClassTeacherOf || []).some((c) => c.grade === g)));
  const addAllTeachersOfGrade = (g) => bulkAddTeachers(allTeachersFull.filter((t) => (t.classAssignments || []).some((c) => c.grade === g) || (t.currentClassTeacherOf || []).some((c) => c.grade === g)));
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
  const sectionCardStyle = { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', background: '#fbfcfe' };
  const presetButtonStyle = { fontSize: '0.8rem', color: '#1e3a8a', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 600 };

  return (
    <div>
      <label style={labelStyle}>Audience — select any combination; the notice reaches the union of all selections below</label>

      <div style={sectionCardStyle}>
        <span style={sectionTitleStyle}>Parents — Grades &amp; Divisions</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: audience.allGrades ? 0 : '10px' }}>
          <label style={pillStyle(audience.allGrades, false)}>
            <input type="checkbox" checked={audience.allGrades} onChange={toggleAllGrades} /> All Grades
          </label>
          {!audience.allGrades && GRADES.map((g) => (
            <label key={g} style={pillStyle(audience.gradeSelections.some((gs) => gs.grade === g), false)}>
              <input type="checkbox" checked={audience.gradeSelections.some((gs) => gs.grade === g)} onChange={() => toggleGrade(g)} /> Grade {g}
            </label>
          ))}
        </div>
        {!audience.allGrades && audience.gradeSelections.length > 0 && (
          <div style={{ display: 'grid', gap: '6px' }}>
            {audience.gradeSelections.slice().sort((x, y) => x.grade - y.grade).map((gs) => (
              <div key={gs.grade} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#334155' }}>Grade {gs.grade}:</strong>
                <label style={pillStyle(gs.allDivisions, false)}>
                  <input type="checkbox" checked={gs.allDivisions} onChange={() => toggleGradeAllDivisions(gs.grade)} /> All Divisions
                </label>
                {!gs.allDivisions && DIVISIONS.map((d) => (
                  <label key={d} style={pillStyle(gs.divisions.includes(d), false)}>
                    <input type="checkbox" checked={gs.divisions.includes(d)} onChange={() => toggleGradeDivision(gs.grade, d)} /> {d}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={sectionCardStyle}>
        <span style={sectionTitleStyle}>Teachers</span>
        <label style={{ ...pillStyle(audience.allTeachers, false), marginBottom: audience.allTeachers ? 0 : '10px' }}>
          <input type="checkbox" checked={audience.allTeachers} onChange={toggleAllTeachers} /> All Teachers
        </label>
        {!audience.allTeachers && (
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
              <button type="button" onClick={addAllClassTeachers} style={presetButtonStyle}>+ All Class Teachers</button>
              <select style={{ ...inputStyle, width: 'auto' }} value={presetGrade} onChange={(e) => setPresetGrade(Number(e.target.value))}>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <button type="button" onClick={() => addClassTeachersOfGrade(presetGrade)} style={presetButtonStyle}>+ Class Teacher(s) of Grade</button>
              <button type="button" onClick={() => addAllTeachersOfGrade(presetGrade)} style={presetButtonStyle}>+ All Teachers of Grade (any division)</button>
            </div>

            {selectedTeachers.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                {selectedTeachers.map((t) => (
                  <span key={t.id} style={chipStyle}>
                    {t.name}
                    <button type="button" onClick={() => removeTeacher(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontWeight: 800 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setShowIndividualTeacherPicker((v) => !v)} style={{ border: 'none', background: 'none', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {showIndividualTeacherPicker ? '▲ Hide individual picker' : '▼ Add individual teachers'}
            </button>
            {showIndividualTeacherPicker && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <button type="button" onClick={() => setTeacherBrowseMode(true)} style={{ ...pillStyle(teacherBrowseMode, false), border: 'none' }}>By Grade &amp; Division</button>
                  <button type="button" onClick={() => setTeacherBrowseMode(false)} style={{ ...pillStyle(!teacherBrowseMode, false), border: 'none' }}>By Name</button>
                </div>
                {teacherBrowseMode ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <select style={{ ...inputStyle, width: 'auto' }} value={teacherGrade} onChange={(e) => setTeacherGrade(Number(e.target.value))}>
                      {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                    <select style={{ ...inputStyle, width: 'auto' }} value={teacherDivision} onChange={(e) => setTeacherDivision(e.target.value)}>
                      {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                ) : (
                  <input style={{ ...inputStyle, width: '260px', marginBottom: '8px' }} placeholder="Search teacher name..." value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} />
                )}
                {(teacherBrowseMode || teacherSearch.trim()) && (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {visibleTeacherResults.map((t) => (
                      <div key={t.id} onClick={() => addTeacher(t)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', background: audience.teacherIds.includes(t.id) ? '#eff6ff' : '#fff' }}>
                        {t.displayName}{(t.currentClassTeacherOf || []).some((c) => c.grade === teacherGrade && c.division === teacherDivision) && teacherBrowseMode ? ' (Class Teacher)' : ''}
                      </div>
                    ))}
                    {visibleTeacherResults.length === 0 && <div style={{ padding: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>{teacherBrowseMode ? 'No teachers assigned to this grade/division.' : 'No teachers found.'}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <span style={sectionTitleStyle}>Specific Students</span>
      <div>
        <label style={{ ...pillStyle(showStudentPicker, false), marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={showStudentPicker}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowStudentPicker(checked);
              if (!checked && audience.studentIds.length > 0) {
                onChange({ ...audience, studentIds: [] });
                setSelectedStudents([]);
              }
            }}
          /> Select Specific Students
        </label>
        {showStudentPicker && (
          <>
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
          </>
        )}
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

  // A class teacher's own grade-division, so the audience picker can default
  // to it when composing a new notice instead of starting empty every time.
  // Only set for an actual class teacher (currentClassTeacherOf), not just
  // any grade/division they happen to teach a subject in.
  const [myClassAssignment, setMyClassAssignment] = useState(null);
  useEffect(() => {
    if (role !== 'teacher') return;
    api.get('/api/auth/me/staff-profile')
      .then((data) => {
        const cls = (data.staffProfile?.currentClassTeacherOf || [])[0];
        if (cls) setMyClassAssignment({ grade: cls.grade, division: cls.division });
      })
      .catch(() => {});
  }, [role]);
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

  // Document attachments (separate from images embedded inline in the
  // message body): pendingDocuments are freshly-picked files not uploaded
  // yet, existingAttachments are already-uploaded ones (edit mode),
  // removedAttachmentIds tracks existing ones marked for removal on save.
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const quillRef = useRef(null);

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

  const formatDate = (dateStr) => (dateStr ? formatDateDMY(dateStr) : '-');

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setExpiresAtTouched(false);
    setEditingId(null);
    setPendingDocuments([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
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
      targetAudience: migrateAudienceForEdit(notice.targetAudience),
    });
    setExpiresAtTouched(true);
    setEditingId(notice._id);
    setPendingDocuments([]);
    setExistingAttachments(notice.attachments || []);
    setRemovedAttachmentIds([]);
    setSaveError(null);
    setShowForm(true);
  };

  const uploadNoticeDocument = async (noticeId, file) => {
    const formData = new FormData();
    formData.append('category', 'notices');
    formData.append('ownerType', 'notice');
    formData.append('ownerId', noticeId);
    formData.append('file', file);
    const token = window.localStorage.getItem('smt-school-token');
    const res = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    if (!res.ok) {
      // Surface the server's actual reason (unsupported type, too large, etc.)
      // instead of a generic message — a silent-looking failure is usually a
      // rejection the user never got to see.
      const reason = await res.json().then((d) => d.message).catch(() => null);
      throw new Error(reason ? `"${file.name}": ${reason}` : `Failed to attach "${file.name}".`);
    }
  };

  // Dropping an image (e.g. a pasted screenshot saved as a file) directly
  // into the message box embeds it inline at the drop position, instead of
  // just being a separate downloadable attachment. Uploads bare (no
  // ownerType/ownerId) since the URL is embedded straight into the body
  // HTML — nothing else needs to reference it as an owned document.
  const handleEditorDrop = async (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    let index = quill.getSelection()?.index ?? quill.getLength();
    try {
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      } else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
      }
      if (range) {
        const blot = Quill.find(range.startContainer, true);
        if (blot) index = quill.getIndex(blot) + range.startOffset;
      }
    } catch {
      // Fall back to the current selection/end-of-document index above.
    }

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('category', 'notices');
        formData.append('file', file);
        const token = window.localStorage.getItem('smt-school-token');
        const res = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
        if (!res.ok) continue;
        const data = await res.json();
        quill.insertEmbed(index, 'image', data.fileUrl, 'user');
        index += 1;
        quill.setSelection(index, 0, 'user');
      } catch {
        // Skip this file, still try any remaining dropped files.
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plainText = form.body.replace(/<[^>]*>/g, '').trim();
    if (!form.title.trim() || !plainText) {
      setSaveError('Title and message are required.');
      return;
    }
    const a = form.targetAudience;
    const hasGradeDivision = a.allGrades || a.gradeSelections.length > 0;
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
      let noticeId = editingId;
      if (editingId) {
        await api.put(`/api/notices/${editingId}`, payload);
      } else {
        const created = await api.post('/api/notices', payload);
        noticeId = created.id;
      }

      await Promise.all(removedAttachmentIds.map((id) => api.delete(`/api/uploads/${id}`).catch(() => {})));
      await Promise.all(pendingDocuments.map((file) => uploadNoticeDocument(noticeId, file)));

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
    const a = migrateAudienceForEdit(audience);
    const chips = [];
    if (a.allGrades) {
      chips.push('All Grades · All divisions');
    } else if (a.gradeSelections.length > 0) {
      a.gradeSelections.slice().sort((x, y) => x.grade - y.grade).forEach((gs) => {
        chips.push(`Grade ${gs.grade} · ${gs.allDivisions ? 'All divisions' : gs.divisions.join(',')}`);
      });
    }
    if (a.allTeachers) chips.push('All Teachers');
    else if (a.teacherIds.length > 0) chips.push(`${a.teacherIds.length} teacher(s)`);
    if (a.studentIds.length > 0) chips.push(`${a.studentIds.length} student(s)`);
    return chips.length ? chips : ['No audience selected'];
  };

  const displayNotices = activeTab === 'active' ? activeNotices : archivedNotices;

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <style>{'.notice-editor .ql-editor { min-height: 280px; } .notice-body-html { overflow-wrap: anywhere; max-width: 100%; } .notice-body-html * { white-space: normal !important; overflow-wrap: anywhere !important; max-width: 100% !important; }'}</style>
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
              onClick={() => {
                if (showForm) {
                  closeForm();
                } else {
                  setSaveError(null);
                  if (myClassAssignment) {
                    setForm((f) => ({
                      ...f,
                      targetAudience: { ...EMPTY_AUDIENCE, gradeSelections: [{ grade: myClassAssignment.grade, allDivisions: false, divisions: [myClassAssignment.division] }] },
                    }));
                  }
                  setShowForm(true);
                }
              }}
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

            <div>
              <label style={labelStyle}>Attach Documents (optional, multiple allowed)</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  setPendingDocuments((prev) => [...prev, ...Array.from(e.target.files)]);
                  // Deferred, not synchronous: resetting a file input's value
                  // from inside its own onChange corrupts React's internal
                  // value-tracking for that element, silently dropping the
                  // NEXT native change event even though the browser fires it
                  // correctly — the exact bug behind "remove and re-add the
                  // same file doesn't work" / "second file in a row doesn't
                  // attach". Letting React finish processing this event
                  // first avoids it.
                  const input = e.target;
                  setTimeout(() => { input.value = ''; }, 0);
                }}
                style={{ ...inputStyle, padding: '8px' }}
              />
              {(existingAttachments.length > 0 || pendingDocuments.length > 0) && (
                <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                  {existingAttachments.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#1e40af' }}>{doc.originalFilename}</a>
                      <button type="button" onClick={() => { setExistingAttachments((prev) => prev.filter((d) => d.id !== doc.id)); setRemovedAttachmentIds((prev) => [...prev, doc.id]); }} style={{ border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>Remove</button>
                    </div>
                  ))}
                  {pendingDocuments.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}>
                      <span style={{ color: '#1e3a8a' }}>{file.name} <em style={{ color: '#64748b', fontStyle: 'normal' }}>({(file.size / 1024).toFixed(0)} KB, new)</em></span>
                      <button type="button" onClick={() => setPendingDocuments((prev) => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Message * <span style={{ fontWeight: 500, color: '#94a3b8' }}>— drag &amp; drop a screenshot/image directly into the box to embed it inline</span></label>
              <div className="notice-editor" style={{ overflowX: 'auto' }} onDrop={handleEditorDrop} onDragOver={(e) => e.preventDefault()}>
                <EditorErrorBoundary>
                  <ReactQuill ref={quillRef} theme="snow" value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} modules={QUILL_MODULES} style={{ background: '#fff' }} />
                </EditorErrorBoundary>
              </div>
            </div>

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
                  {notice.issuedBy && <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>By {notice.issuedBy}</span>}
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
                  {notice.issuedBy && <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>By {notice.issuedBy}</p>}
                  <div
                    className="notice-body-html"
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
