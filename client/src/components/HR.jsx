import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from './SearchBar';
import { api } from '../api';

const SUBJECTS_G1_G4 = [
  'Library', 'Maths', 'EVS', 'English', 'Hindi', 'Marathi', 'Yoga', 'Gym', 'Cyber / Computer',
];

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const ROLE_TAGS = ['Teacher', 'Class Teacher', 'Principal', 'Vice Principal', 'Admin', 'Office Staff'];

const EMPTY_STAFF_FORM = {
  staffCode: '', displayName: '', firstName: '', lastName: '', gender: 'Female', category: 'Teaching',
  department: '', role: 'Teacher', roles: ['Teacher'], qualification: '', joiningDate: '', phone: '', email: '',
  photoUrl: '', houseId: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  assignedSubjectsText: '', status: 'Active',
};

const HR = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 920);
  const [staffQuery, setStaffQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedPayBand, setSelectedPayBand] = useState('all');
  const [allStaff, setAllStaff] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [editingCode, setEditingCode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [classModalCode, setClassModalCode] = useState(null);
  const [classForm, setClassForm] = useState({ grade: '', division: '' });
  const [classAsTeacherOf, setClassAsTeacherOf] = useState(false);
  const [classError, setClassError] = useState('');

  const [loginModalCode, setLoginModalCode] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginResult, setLoginResult] = useState(null);
  const [loginError, setLoginError] = useState('');

  const [resetModalCode, setResetModalCode] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 920);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const reload = () => {
    setLoading(true);
    return api.get('/api/staff')
      .then((data) => { setAllStaff(data.staff || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => { api.get('/api/houses').then((d) => setHouses(d.houses || [])).catch(() => {}); }, []);

  const openAddStaff = () => {
    setEditingCode(null);
    setStaffForm(EMPTY_STAFF_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEditStaff = (person) => {
    setEditingCode(person.staffCode);
    setStaffForm({
      staffCode: person.staffCode, displayName: person.displayName, firstName: person.firstName, lastName: person.lastName,
      gender: person.gender || 'Female', category: person.category, department: person.department || '',
      role: person.role || 'Teacher', roles: person.roles && person.roles.length ? person.roles : [person.role || 'Teacher'],
      qualification: person.qualification || '', joiningDate: person.joiningDate ? person.joiningDate.slice(0, 10) : '',
      phone: person.phone || '', email: person.email || '', photoUrl: person.photoUrl || '',
      houseId: person.houseId || '', emergencyContactName: person.emergencyContactName || '',
      emergencyContactPhone: person.emergencyContactPhone || '', emergencyContactRelation: person.emergencyContactRelation || '',
      assignedSubjectsText: (person.assignedSubjects || []).join(', '), status: person.status || 'Active',
    });
    setFormError('');
    setFormOpen(true);
  };

  const toggleRoleTag = (tag) => {
    setStaffForm((f) => ({
      ...f,
      roles: f.roles.includes(tag) ? f.roles.filter((r) => r !== tag) : [...f.roles, tag],
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('category', 'staff-photos');
    formData.append('file', file);
    const token = window.localStorage.getItem('smt-school-token');
    fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      .then((r) => r.json().then((data) => { if (!r.ok) throw new Error(data.message); return data; }))
      .then((data) => { setStaffForm((f) => ({ ...f, photoUrl: data.fileUrl })); setUploadingPhoto(false); })
      .catch(() => setUploadingPhoto(false));
    e.target.value = '';
  };

  const submitStaffForm = () => {
    if (!staffForm.staffCode.trim() || !staffForm.displayName.trim() || !staffForm.firstName.trim() || !staffForm.lastName.trim()) {
      setFormError('Employee ID, display name, first and last name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      ...staffForm,
      assignedSubjects: staffForm.assignedSubjectsText.split(',').map((s) => s.trim()).filter(Boolean),
      houseId: staffForm.houseId || null,
    };
    delete payload.assignedSubjectsText;
    const request = editingCode ? api.put(`/api/staff/${editingCode}`, payload) : api.post('/api/staff', payload);
    request
      .then(() => { setSaving(false); setFormOpen(false); reload(); })
      .catch((err) => { setSaving(false); setFormError(err.message || 'Failed to save staff record.'); });
  };

  const openClassModal = (person) => {
    setClassModalCode(person.staffCode);
    setClassForm({ grade: '', division: '' });
    setClassAsTeacherOf(false);
    setClassError('');
  };

  const addClassAssignment = () => {
    if (!classForm.grade || !classForm.division) { setClassError('Grade and division are required.'); return; }
    setClassError('');
    const action = classAsTeacherOf
      ? api.post(`/api/staff/${classModalCode}/class-teacher`, { grade: Number(classForm.grade), division: classForm.division })
      : api.post(`/api/staff/${classModalCode}/class-assignments`, { grade: Number(classForm.grade), division: classForm.division });
    action
      .then(() => { setClassForm({ grade: '', division: '' }); setClassAsTeacherOf(false); reload(); })
      .catch((err) => setClassError(err.message || 'Failed to add assignment.'));
  };

  const removeClassAssignment = (id) => {
    api.delete(`/api/staff/${classModalCode}/class-assignments/${id}`).then(reload).catch(() => {});
  };

  const vacateClassTeacher = () => {
    api.delete(`/api/staff/${classModalCode}/class-teacher`).then(reload).catch(() => {});
  };

  const openLoginModal = (person) => {
    setLoginModalCode(person.staffCode);
    setLoginUsername('');
    setLoginResult(null);
    setLoginError('');
  };

  const submitLinkLogin = () => {
    setLoginError('');
    api.post(`/api/staff/${loginModalCode}/link-login`, loginUsername.trim() ? { username: loginUsername.trim() } : {})
      .then((result) => { setLoginResult(result); reload(); })
      .catch((err) => setLoginError(err.message || 'Failed to link login.'));
  };

  const openResetModal = (person) => {
    setResetModalCode(person.staffCode);
    setResetResult(null);
    setResetError('');
    api.post(`/api/staff/${person.staffCode}/reset-password`)
      .then((result) => setResetResult(result))
      .catch((err) => setResetError(err.message || 'Failed to reset password.'));
  };

  const getAcademicYearLabel = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    return `${startYear}-${String(endYear).slice(-2)}`;
  };

  const academicYear = useMemo(() => getAcademicYearLabel(new Date()), []);

  const teachingStaff = useMemo(() => allStaff.filter((s) => s.category === 'Teaching'), [allStaff]);
  const nonTeachingStaff = useMemo(() => allStaff.filter((s) => s.category === 'Non-Teaching'), [allStaff]);

  const filteredStaff = useMemo(() => {
    const query = staffQuery.trim().toLowerCase();
    if (!query) return allStaff;
    return allStaff.filter((member) => {
      return (member.displayName || '').toLowerCase().includes(query)
        || (member.staffCode || '').toLowerCase().includes(query)
        || (member.role || '').toLowerCase().includes(query)
        || (member.department || '').toLowerCase().includes(query)
        || (member.category || '').toLowerCase().includes(query)
        || (member.assignedSubjects || []).join(', ').toLowerCase().includes(query);
    });
  }, [staffQuery, allStaff]);

  const stats = useMemo(() => {
    const total = allStaff.length;
    const teaching = teachingStaff.length;
    const nonTeaching = nonTeachingStaff.length;
    const active = allStaff.filter((s) => s.status === 'Active').length;
    const teachingShare = total > 0 ? Math.round((teaching / total) * 100) : 0;
    const womenTeachingShare = teaching > 0 ? Math.round((teachingStaff.filter((s) => s.gender === 'Female').length / teaching) * 100) : 0;
    return { total, teaching, nonTeaching, active, teachingShare, womenTeachingShare };
  }, [allStaff, teachingStaff, nonTeachingStaff]);

  // Real teacher->division assignments (staff_class_assignments), replacing the
  // old hardcoded DIVISION_SUBJECT_TEACHER_CODES map. Subject matching still uses
  // each teacher's own assignedSubjects field since class assignments are
  // grade/division only, not subject-specific.
  const teacherDivisionAssignments = useMemo(() => {
    const map = {};
    allStaff.forEach((person) => {
      const divisions = new Set((person.classAssignments || []).map((c) => c.division));
      map[person.staffCode] = { divisions, subjects: new Set(person.assignedSubjects || []) };
    });
    return map;
  }, [allStaff]);

  const getPayBand = (monthlyGross) => {
    if (monthlyGross >= 65000) return '65k+';
    if (monthlyGross >= 55000) return '55k-64k';
    return 'below-55k';
  };

  const filteredTeachingAnalytics = useMemo(() => {
    return teachingStaff.filter((teacher) => {
      const assignment = teacherDivisionAssignments[teacher.staffCode] || { divisions: new Set(), subjects: new Set() };
      const subjectMatch = selectedSubject === 'all' ? true : assignment.subjects.has(selectedSubject) || (teacher.assignedSubjects || []).includes(selectedSubject);
      const divisionMatch = selectedDivision === 'all' ? true : assignment.divisions.has(selectedDivision);
      const payBandMatch = selectedPayBand === 'all' ? true : getPayBand((teacher.compensation || {}).monthlyGross || 0) === selectedPayBand;
      return subjectMatch && divisionMatch && payBandMatch;
    });
  }, [selectedSubject, selectedDivision, selectedPayBand, teacherDivisionAssignments, teachingStaff]);

  const analyticsSummary = useMemo(() => {
    if (filteredTeachingAnalytics.length === 0) return { avgMonthlyGross: 0, avgAnnualCtc: 0, avgClassesYtd: 0 };
    const totals = filteredTeachingAnalytics.reduce((acc, teacher) => {
      acc.monthly += (teacher.compensation || {}).monthlyGross || 0;
      acc.annual += (teacher.compensation || {}).annualCtc || 0;
      acc.classesYtd += teacher.classesTakenYtd || 0;
      return acc;
    }, { monthly: 0, annual: 0, classesYtd: 0 });
    return {
      avgMonthlyGross: Math.round(totals.monthly / filteredTeachingAnalytics.length),
      avgAnnualCtc: Math.round(totals.annual / filteredTeachingAnalytics.length),
      avgClassesYtd: Math.round(totals.classesYtd / filteredTeachingAnalytics.length),
    };
  }, [filteredTeachingAnalytics]);

  const summaryCardStyle = {
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #bfdbfe',
    background: '#ffffff',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
  };

  if (loading) {
    return (
      <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <p style={{ color: '#64748b' }}>Loading staff data...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto', background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: '8px', color: '#0f172a' }}>Human Resources (HR) Master Faculty Grid</h2>
            <p style={{ color: '#475569', marginTop: 0 }}>
              Unified staff roster with compensation details and faculty mapping used across timetable modules. Academic Year {academicYear} (April to March).
            </p>
          </div>
          <button type="button" onClick={openAddStaff} style={{ padding: '11px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Add Staff
          </button>
        </div>
        <p style={{ color: '#475569', marginTop: '6px', marginBottom: '14px', fontSize: '0.93rem' }}>
          Grade 1-4 subject basket: {SUBJECTS_G1_G4.join(', ')}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Total Staff</p><strong style={{ fontSize: '1.2rem', color: '#1d4ed8' }}>{stats.total}</strong></div>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Teaching</p><strong style={{ fontSize: '1.2rem', color: '#16a34a' }}>{stats.teaching}</strong></div>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Non-Teaching</p><strong style={{ fontSize: '1.2rem', color: '#ea580c' }}>{stats.nonTeaching}</strong></div>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Active</p><strong style={{ fontSize: '1.2rem', color: '#0f766e' }}>{stats.active}</strong></div>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Teaching Share</p><strong style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{stats.teachingShare}%</strong></div>
          <div style={summaryCardStyle}><p style={{ margin: 0, color: '#64748b' }}>Women Faculty Share</p><strong style={{ fontSize: '1.2rem', color: '#0ea5e9' }}>{stats.womenTeachingShare}%</strong></div>
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '14px', padding: '14px', border: '1px solid #bfdbfe', borderRadius: '14px', background: '#ffffff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#0f172a' }}>Faculty Workload and Compensation Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(180px, 1fr))', gap: '10px' }}>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Subjects</option>
              {SUBJECTS_G1_G4.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
            <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Divisions</option>
              <option value="alpha">Alpha</option>
              <option value="beta">Beta</option>
              <option value="gamma">Gamma</option>
            </select>
            <select value={selectedPayBand} onChange={(e) => setSelectedPayBand(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Pay Bands</option>
              <option value="below-55k">Below Rs. 55,000</option>
              <option value="55k-64k">Rs. 55,000 - Rs. 64,999</option>
              <option value="65k+">Rs. 65,000 and above</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Matched Faculty</p>
              <strong>{filteredTeachingAnalytics.length}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Monthly Gross</p>
              <strong>Rs. {analyticsSummary.avgMonthlyGross.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Annual CTC</p>
              <strong>Rs. {analyticsSummary.avgAnnualCtc.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Classes YTD</p>
              <strong>{analyticsSummary.avgClassesYtd}</strong>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: '12px', color: '#0f172a' }}>Staff Profiles</h3>
        <SearchBar
          value={staffQuery}
          onChange={(e) => setStaffQuery(e.target.value)}
          placeholder="Search by name, faculty code, role, subject, department or category"
          maxWidth="680px"
          containerStyle={{ marginBottom: '12px' }}
          inputStyle={{ border: '1px solid #bfdbfe' }}
        />
        <p style={{ color: '#64748b', marginTop: 0, marginBottom: '12px' }}>Showing {filteredStaff.length} of {allStaff.length} staff members.</p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px' }}>
          {filteredStaff.map((person) => (
            <article
              key={person.staffCode}
              style={{
                border: `1px solid ${person.category === 'Teaching' ? '#86efac' : '#fed7aa'}`,
                borderRadius: '16px',
                background: '#fff',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.07)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src={person.photoUrl}
                  alt={`${person.displayName} avatar`}
                  style={{ width: '74px', height: '74px', borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fafc' }}
                />
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a' }}>{person.displayName}</h4>
                  <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '0.9rem' }}>{person.role}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{person.staffCode} {person.category}</p>
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '6px', fontSize: '0.83rem', color: '#475569' }}>
                <span><strong>Department:</strong> {person.department}</span>
                <span><strong>Status:</strong> {person.status}</span>
                <span><strong>Qualification:</strong> {person.qualification}</span>
                <span><strong>Prior Exp:</strong> {person.experienceYearsPrior} yrs</span>
                <span><strong>Current School:</strong> {person.experienceYearsCurrentSchool} yrs</span>
                <span><strong>Joining:</strong> {person.joiningDate ? new Date(person.joiningDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span>
                <span><strong>Phone:</strong> {person.phone}</span>
                <span><strong>Email:</strong> {person.email}</span>
                <span><strong>Classes Total:</strong> {person.classesTakenTotal}</span>
                <span><strong>Classes YTD:</strong> {person.classesTakenYtd}</span>
              </div>

              {person.assignedSubjects && person.assignedSubjects.length > 0 ? (
                <p style={{ marginTop: '8px', marginBottom: 0, color: '#475569', fontSize: '0.85rem' }}>
                  <strong>Assigned Subjects:</strong> {person.assignedSubjects.join(', ')}
                </p>
              ) : null}

              {(person.roles && person.roles.length > 0) || person.houseId || (person.currentClassTeacherOf || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {(person.roles || []).map((r) => (
                    <span key={r} style={{ padding: '3px 9px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontSize: '0.72rem', fontWeight: 700 }}>{r}</span>
                  ))}
                  {(person.currentClassTeacherOf || []).map((c) => (
                    <span key={`${c.grade}-${c.division}`} style={{ padding: '3px 9px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 700 }}>Class Teacher: G{c.grade} {c.division.charAt(0).toUpperCase() + c.division.slice(1)}</span>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '0.85rem' }}>
                  <strong>Compensation:</strong> Base Rs. {((person.compensation || {}).basePay || 0).toLocaleString('en-IN')} + HRA Rs. {((person.compensation || {}).hra || 0).toLocaleString('en-IN')} + Academic Allowance Rs. {((person.compensation || {}).academicAllowance || 0).toLocaleString('en-IN')}
                </p>
                <p style={{ margin: '6px 0 0', color: '#1f2937', fontSize: '0.85rem' }}>
                  <strong>Monthly Gross:</strong> Rs. {((person.compensation || {}).monthlyGross || 0).toLocaleString('en-IN')} | <strong>Bonus:</strong> Rs. {((person.compensation || {}).performanceBonus || 0).toLocaleString('en-IN')} | <strong>Annual CTC:</strong> Rs. {((person.compensation || {}).annualCtc || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => openEditStaff(person)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}>Edit</button>
                <button type="button" onClick={() => openClassModal(person)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}>Manage Classes</button>
                {!person.userId ? (
                  <button type="button" onClick={() => openLoginModal(person)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}>Link Login</button>
                ) : (
                  <button type="button" onClick={() => openResetModal(person)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}>Reset Password</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {formOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => !saving && setFormOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingCode ? 'Edit Staff' : 'Add Staff'}</h3>
            {formError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{formError}</p>}

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
              <img src={staffForm.photoUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(staffForm.displayName || '?')} alt="" style={{ width: '64px', height: '64px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
              <label style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem' }}>
                {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Employee ID *
                <input disabled={!!editingCode} value={staffForm.staffCode} onChange={(e) => setStaffForm((f) => ({ ...f, staffCode: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Display Name *
                <input value={staffForm.displayName} onChange={(e) => setStaffForm((f) => ({ ...f, displayName: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>First Name *
                <input value={staffForm.firstName} onChange={(e) => setStaffForm((f) => ({ ...f, firstName: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Last Name *
                <input value={staffForm.lastName} onChange={(e) => setStaffForm((f) => ({ ...f, lastName: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gender
                <select value={staffForm.gender} onChange={(e) => setStaffForm((f) => ({ ...f, gender: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category
                <select value={staffForm.category} onChange={(e) => setStaffForm((f) => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                  <option value="Teaching">Teaching</option>
                  <option value="Non-Teaching">Non-Teaching</option>
                </select>
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status
                <select value={staffForm.status} onChange={(e) => setStaffForm((f) => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Resigned">Resigned</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Department
                <input value={staffForm.department} onChange={(e) => setStaffForm((f) => ({ ...f, department: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Primary Role
                <input value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
            </div>

            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '12px', marginBottom: '4px' }}>Role Tags</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ROLE_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleRoleTag(tag)} style={{ padding: '5px 10px', borderRadius: '999px', border: staffForm.roles.includes(tag) ? '1px solid #1d4ed8' : '1px solid #cbd5e1', background: staffForm.roles.includes(tag) ? '#dbeafe' : '#fff', color: staffForm.roles.includes(tag) ? '#1d4ed8' : '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>{tag}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Qualification
                <input value={staffForm.qualification} onChange={(e) => setStaffForm((f) => ({ ...f, qualification: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Joining Date
                <input type="date" value={staffForm.joiningDate} onChange={(e) => setStaffForm((f) => ({ ...f, joiningDate: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Phone
                <input value={staffForm.phone} onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Email
                <input value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
              </label>
            </div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginTop: '10px' }}>Assigned Subjects (comma-separated)
              <input value={staffForm.assignedSubjectsText} onChange={(e) => setStaffForm((f) => ({ ...f, assignedSubjectsText: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} placeholder="English, Library" />
            </label>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginTop: '10px' }}>House
              <select value={staffForm.houseId} onChange={(e) => setStaffForm((f) => ({ ...f, houseId: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                <option value="">Not assigned</option>
                {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>

            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '14px', marginBottom: '4px' }}>Emergency Contact</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <input placeholder="Name" value={staffForm.emergencyContactName} onChange={(e) => setStaffForm((f) => ({ ...f, emergencyContactName: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input placeholder="Phone" value={staffForm.emergencyContactPhone} onChange={(e) => setStaffForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input placeholder="Relation" value={staffForm.emergencyContactRelation} onChange={(e) => setStaffForm((f) => ({ ...f, emergencyContactRelation: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={submitStaffForm} disabled={saving} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {classModalCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setClassModalCode(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Manage Classes — {classModalCode}</h3>
            {classError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{classError}</p>}

            {(() => {
              const person = allStaff.find((s) => s.staffCode === classModalCode);
              if (!person) return null;
              return (
                <>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Current Assignments</p>
                  {(person.classAssignments || []).length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No classes assigned yet.</p>
                  ) : person.classAssignments.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '6px' }}>
                      <span>Grade {c.grade} {c.division.charAt(0).toUpperCase() + c.division.slice(1)}</span>
                      <button type="button" onClick={() => removeClassAssignment(c.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.76rem' }}>Remove</button>
                    </div>
                  ))}

                  {(person.currentClassTeacherOf || []).length > 0 && (
                    <>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '12px', marginBottom: '6px' }}>Class Teacher Of</p>
                      {person.currentClassTeacherOf.map((c) => (
                        <div key={`${c.grade}-${c.division}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: '8px', marginBottom: '6px' }}>
                          <span>Grade {c.grade} {c.division.charAt(0).toUpperCase() + c.division.slice(1)}</span>
                          <button type="button" onClick={vacateClassTeacher} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.76rem' }}>Vacate</button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}

            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '14px', marginBottom: '6px' }}>Add Assignment</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select value={classForm.grade} onChange={(e) => setClassForm((f) => ({ ...f, grade: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">Grade</option>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <select value={classForm.division} onChange={(e) => setClassForm((f) => ({ ...f, division: e.target.value }))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">Division</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <label style={{ fontSize: '0.82rem', display: 'block', marginTop: '8px' }}>
              <input type="checkbox" checked={classAsTeacherOf} onChange={(e) => setClassAsTeacherOf(e.target.checked)} /> Also assign as Class Teacher of this grade/division (reassigns if someone else currently holds it)
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setClassModalCode(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Close</button>
              <button type="button" onClick={addClassAssignment} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {loginModalCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setLoginModalCode(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Link Login — {loginModalCode}</h3>
            {loginResult ? (
              <div>
                {loginResult.created ? (
                  <>
                    <p style={{ color: '#16a34a', fontWeight: 600 }}>New login created — relay these credentials, shown only once:</p>
                    <div style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', fontFamily: 'monospace' }}>
                      {loginResult.created.username} / {loginResult.created.tempPassword}
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#16a34a', fontWeight: 600 }}>Linked to existing account: {loginResult.linked.username}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setLoginModalCode(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </div>
              </div>
            ) : (
              <>
                {loginError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{loginError}</p>}
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Existing username (leave blank to create a new login)
                  <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={() => setLoginModalCode(null)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={submitLinkLogin} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Link</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {resetModalCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setResetModalCode(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Reset Password — {resetModalCode}</h3>
            {resetError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{resetError}</p>}
            {resetResult && (
              <>
                <p style={{ color: '#16a34a', fontWeight: 600 }}>New password generated — relay this, shown only once:</p>
                <div style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', fontFamily: 'monospace' }}>
                  {resetResult.username} / {resetResult.tempPassword}
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setResetModalCode(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default HR;
