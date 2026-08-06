import React, { useEffect, useState } from 'react';
import { api } from '../api';

// Shared by Communication.jsx (Notices) and Forms.jsx — one audience-selection
// UI/data-shape for anything that needs to reach "some combination of
// grades+divisions (→ parents), teachers, and/or specific students." Grade/
// division selection always reaches parents directly; there's no separate
// "target parents" toggle to forget, same as toggleGrade below defaulting a
// newly-picked grade to "all divisions" immediately rather than requiring a
// commit step.
export const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
export const DIVISIONS = ['alpha', 'beta', 'gamma'];

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
      <label style={labelStyle}>Audience — select any combination; this reaches the union of all selections below</label>

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

export default AudiencePicker;
