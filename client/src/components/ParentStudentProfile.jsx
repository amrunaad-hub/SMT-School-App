import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { INDIAN_STATES, districtsForState } from '../utils/indiaStatesDistricts';

const DOC_TYPES = ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'personal', label: 'Personal & Identity' },
  { key: 'contact', label: 'Contact & Medical' },
  { key: 'previousSchool', label: 'Previous School' },
  { key: 'siblings', label: 'Siblings' },
  { key: 'guardians', label: 'Guardians' },
  { key: 'documents', label: 'Documents' },
  { key: 'myRequests', label: 'My Requests' },
];

// Fields marked locked:true go through admin approval instead of a direct
// save — must stay in sync with LOCKED_EDIT_FIELDS/DIRECT_EDIT_FIELDS on the
// server (server/routes/students.js), which enforces this same split.
const OVERVIEW_FIELDS = [{ key: 'photoUrl', label: 'Photo URL' }];
const PERSONAL_FIELDS = [
  { key: 'firstName', label: 'First Name', locked: true },
  { key: 'middleName', label: 'Middle Name', locked: true },
  { key: 'lastName', label: 'Last Name', locked: true },
  { key: 'dob', label: 'Date of Birth', type: 'date', locked: true },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'religion', label: 'Religion' },
  { key: 'caste', label: 'Caste' },
  { key: 'subCaste', label: 'Sub-Caste' },
  { key: 'category', label: 'Category' },
  { key: 'nationality', label: 'Nationality', type: 'select', options: ['Indian', 'Other'] },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'birthPlace', label: 'Birth Place' },
  { key: 'birthState', label: 'Birth State', type: 'state' },
  { key: 'birthDistrict', label: 'Birth District', type: 'district' },
  { key: 'birthTaluka', label: 'Birth Taluka' },
  { key: 'nativeAddress', label: 'Native Address' },
  { key: 'heightCm', label: 'Height (cm)', type: 'number' },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
  { key: 'handicapType', label: 'Handicap Type' },
  { key: 'aadharNumber', label: 'Aadhar Number', locked: true },
  { key: 'apaarId', label: 'APAAR ID', locked: true },
  { key: 'grNo', label: 'GR No', locked: true },
  { key: 'penNo', label: 'PEN No', locked: true },
  { key: 'studentSaralNo', label: 'Student SARAL No', locked: true },
];
const CONTACT_FIELDS = [
  { key: 'address', label: 'Address' },
  { key: 'studentEmail', label: 'Student Email' },
  { key: 'studentMobile', label: 'Student Mobile' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'medicalConditions', label: 'Medical Conditions' },
  { key: 'medicalNotes', label: 'Medical Notes', type: 'textarea' },
];
const PREVIOUS_SCHOOL_FIELDS = [
  { key: 'previousSchoolName', label: 'School Name' },
  { key: 'previousSchoolBoard', label: 'Board' },
  { key: 'previousGradeCompleted', label: 'Last Grade Completed' },
  { key: 'previousSchoolMedium', label: 'Medium' },
  { key: 'previousSchoolPassYear', label: 'Pass Year' },
  { key: 'previousSchoolSeatNumber', label: 'Seat Number' },
  { key: 'previousSchoolPercentage', label: '% Marks', type: 'number' },
  { key: 'previousSchoolLcNumber', label: 'LC Number' },
  { key: 'previousSchoolLcDate', label: 'LC Date', type: 'date' },
  { key: 'previousSchoolLeaveDate', label: 'Leave Date', type: 'date' },
  { key: 'previousSchoolReasonLeave', label: 'Reason for Leaving' },
  { key: 'previousSchoolRemarks', label: 'Remarks', type: 'textarea' },
];
const FIELDS_FOR_TAB = { overview: OVERVIEW_FIELDS, personal: PERSONAL_FIELDS, contact: CONTACT_FIELDS, previousSchool: PREVIOUS_SCHOOL_FIELDS };

const STATUS_BADGE = { Pending: { bg: '#fef3c7', color: '#92400e' }, Approved: { bg: '#dcfce7', color: '#166534' }, Rejected: { bg: '#fee2e2', color: '#991b1b' } };

const ParentStudentProfile = ({ studentId, isMobile }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saveNotice, setSaveNotice] = useState('');

  const [editTab, setEditTab] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [siblingRows, setSiblingRows] = useState([]);

  const [guardianEditId, setGuardianEditId] = useState(null);
  const [guardianForm, setGuardianForm] = useState({});
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [guardianError, setGuardianError] = useState('');

  const [docType, setDocType] = useState('Other');
  const [uploading, setUploading] = useState(false);
  const [docSubmitError, setDocSubmitError] = useState('');

  const [myRequests, setMyRequests] = useState([]);

  const loadStudent = () => {
    if (!studentId) return;
    setLoading(true);
    api.get(`/api/students/${studentId}`)
      .then((data) => { setStudent(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  };
  const loadMyRequests = () => {
    api.get('/api/students/edit-requests').then((d) => setMyRequests(d.requests || [])).catch(() => {});
  };

  useEffect(loadStudent, [studentId]);
  useEffect(loadMyRequests, [studentId]);
  useEffect(() => { api.get('/api/auth/me').then((d) => setMyUserId(d.user.id)).catch(() => {}); }, []);
  useEffect(() => { setActiveTab('overview'); setSaveNotice(''); }, [studentId]);

  const openEdit = (tabKey) => {
    if (!student) return;
    const fields = FIELDS_FOR_TAB[tabKey];
    const form = {};
    fields.forEach((f) => {
      let v = student[f.key];
      if (f.type === 'date' && v) v = String(v).slice(0, 10);
      form[f.key] = v ?? '';
    });
    setEditForm(form);
    setSaveError('');
    setEditTab(tabKey);
  };

  const submitEdit = async () => {
    const fields = FIELDS_FOR_TAB[editTab];
    const directChanges = {};
    const lockedChanges = {};
    fields.forEach((f) => {
      let original = student[f.key];
      if (f.type === 'date' && original) original = String(original).slice(0, 10);
      const next = editForm[f.key];
      if (String(next ?? '') === String(original ?? '')) return;
      if (f.locked) lockedChanges[f.key] = next; else directChanges[f.key] = next;
    });
    if (Object.keys(directChanges).length === 0 && Object.keys(lockedChanges).length === 0) {
      setEditTab(null);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const calls = [];
      if (Object.keys(directChanges).length > 0) calls.push(api.put(`/api/students/${studentId}/self`, directChanges));
      if (Object.keys(lockedChanges).length > 0) calls.push(api.post(`/api/students/${studentId}/edit-requests`, { kind: 'fields', changes: lockedChanges }));
      await Promise.all(calls);
      const parts = [];
      if (Object.keys(directChanges).length) parts.push(`${Object.keys(directChanges).length} change(s) saved`);
      if (Object.keys(lockedChanges).length) parts.push(`${Object.keys(lockedChanges).length} change(s) submitted for admin approval`);
      setSaveNotice(parts.join(' · '));
      setEditTab(null);
      loadStudent();
      loadMyRequests();
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const openSiblingsEdit = () => {
    const declared = Array.isArray(student.siblingsDeclared) ? student.siblingsDeclared : [];
    setSiblingRows(declared.map((s) => ({ name: s.name || '', standard: s.standard || '', relation: s.relation || '' })));
    setSaveError('');
    setEditTab('siblings');
  };
  const submitSiblings = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put(`/api/students/${studentId}/self`, { siblingsDeclared: siblingRows.filter((s) => s.name.trim()) });
      setEditTab(null);
      setSaveNotice('Siblings updated.');
      loadStudent();
    } catch (err) {
      setSaveError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const openGuardianEdit = (g) => {
    setGuardianForm({
      fullName: g.fullName || '', mobile: g.mobile || '', email: g.email || '',
      occupation: g.occupation || '', qualification: g.qualification || '', officeAddress: g.officeAddress || '', address: g.address || '',
    });
    setGuardianError('');
    setGuardianEditId(g.id);
  };
  const submitGuardian = async () => {
    setGuardianSaving(true);
    setGuardianError('');
    try {
      await api.put(`/api/students/${studentId}/guardians/${guardianEditId}/self`, guardianForm);
      setGuardianEditId(null);
      setSaveNotice('Your guardian details were updated.');
      loadStudent();
    } catch (err) {
      setGuardianError(err.message || 'Failed to save.');
    } finally {
      setGuardianSaving(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setDocSubmitError('');
    try {
      const token = window.localStorage.getItem('smt-school-token');
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Upload failed.');
      await api.post(`/api/students/${studentId}/edit-requests`, { kind: 'document', docType, fileUrl: data.fileUrl, originalFilename: data.originalFilename });
      setSaveNotice('Document submitted for admin approval.');
      loadMyRequests();
    } catch (err) {
      setDocSubmitError(err.message || 'Failed to submit document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const cardStyle = { padding: isMobile ? '16px' : '24px', borderRadius: '16px', background: '#fff', border: '2px solid #0ea5e9', boxShadow: '0 4px 16px rgba(6, 182, 212, 0.08)' };
  const fieldStyle = { padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', fontSize: isMobile ? '0.85rem' : '0.9rem' };
  const detailStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '12px' };
  const btnStyle = { padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 };
  const primaryBtnStyle = { ...btnStyle, background: '#0ea5e9', color: '#fff', border: '1px solid #0ea5e9' };
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' };
  const modalBox = { background: '#fff', borderRadius: '14px', padding: '22px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' };
  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginTop: '10px' };
  const lockBadge = { marginLeft: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '999px' };

  if (loading) return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading profile…</div>;
  if (error) return <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>{error}</div>;
  if (!student) return null;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} style={{ padding: '7px 12px', borderRadius: '999px', border: `1px solid ${activeTab === t.key ? '#0369a1' : '#cbd5e1'}`, background: activeTab === t.key ? '#0369a1' : '#fff', color: activeTab === t.key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>
            {t.label}
          </button>
        ))}
      </div>

      {saveNotice && (
        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.82rem', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <span>{saveNotice}</span>
          <button type="button" onClick={() => setSaveNotice('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 800 }}>×</button>
        </div>
      )}

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={student.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${student._id}`} alt="Student" style={{ width: '96px', height: '96px', borderRadius: '12px', border: '3px solid #0ea5e9' }} />
            <div>
              <h3 style={{ margin: 0 }}>{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')} <span style={lockBadge}>🔒 name/DOB need admin approval</span></h3>
              <p style={{ margin: '4px 0 0', color: '#64748b' }}>{student.studentCode}</p>
              {student.house && <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: '#fff', background: student.house.colorHex }}>{student.house.name} House</span>}
            </div>
            <button type="button" style={btnStyle} onClick={() => openEdit('overview')}>Change Photo</button>
          </div>
          <div style={detailStyle}>
            <div style={fieldStyle}><strong>Grade:</strong> Grade {student.grade} {student.division ? student.division.charAt(0).toUpperCase() + student.division.slice(1) : ''}</div>
            <div style={fieldStyle}><strong>Roll No:</strong> {student.rollNo}</div>
            <div style={fieldStyle}><strong>Admission Year:</strong> {student.admissionYear || '—'}</div>
            <div style={fieldStyle}><strong>Status:</strong> {student.status}</div>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '10px' }}>Grade, division, roll number, house, and status are set by the school office and can't be changed here.</p>
        </div>
      )}

      {(activeTab === 'personal' || activeTab === 'contact' || activeTab === 'previousSchool') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button type="button" style={primaryBtnStyle} onClick={() => openEdit(activeTab)}>Edit</button>
          </div>
          <div style={detailStyle}>
            {FIELDS_FOR_TAB[activeTab].map((f) => (
              <div key={f.key} style={fieldStyle}>
                <strong>{f.label}{f.locked && <span style={lockBadge}>🔒</span>}:</strong> {student[f.key] || '—'}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'siblings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button type="button" style={primaryBtnStyle} onClick={openSiblingsEdit}>Edit</button>
          </div>
          {(student.siblingsDeclared || []).filter((s) => s && s.name).length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No siblings declared.</p>
          ) : student.siblingsDeclared.filter((s) => s && s.name).map((s, i) => (
            <div key={i} style={{ ...fieldStyle, marginBottom: '8px' }}><strong>{s.name}</strong> — {s.standard || '—'} {s.relation ? `(${s.relation})` : ''}</div>
          ))}
        </div>
      )}

      {activeTab === 'guardians' && (
        <div>
          {(student.guardians || []).map((g) => (
            <div key={g.id} style={{ ...fieldStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
              <div>
                <strong>{g.fullName}</strong> — {g.relation}
                {g.isPrimary && <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>PRIMARY</span>}
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{g.mobile}{g.email ? ` · ${g.email}` : ''}</div>
                {(g.qualification || g.occupation || g.officeAddress) && (
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{[g.qualification, g.occupation, g.officeAddress].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              {myUserId && g.userId === myUserId
                ? <button type="button" style={btnStyle} onClick={() => openGuardianEdit(g)}>Edit</button>
                : <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Read-only</span>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ ...btnStyle, display: 'inline-block' }}>
              {uploading ? 'Uploading…' : 'Add / Replace Document'}
              <input type="file" onChange={handleDocUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          {docSubmitError && <p style={{ color: '#dc2626', fontSize: '0.82rem' }}>{docSubmitError}</p>}
          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '10px' }}>Uploaded documents go to the admin for approval before they're attached to the record.</p>
          {(student.documents || []).length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No documents on file.</p>
          ) : student.documents.map((doc) => (
            <div key={doc.id} style={{ ...fieldStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div><strong>{doc.docType}</strong><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.originalFilename}</div></div>
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={btnStyle}>View</a>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'myRequests' && (
        <div>
          {myRequests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No edit requests submitted yet.</p>
          ) : myRequests.map((r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.Pending;
            return (
              <div key={r._id} style={{ ...fieldStyle, marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <strong>{r.kind === 'fields' ? 'Field change' : 'Document'} — {r.studentName}</strong>
                  <span style={{ padding: '2px 10px', borderRadius: '999px', background: badge.bg, color: badge.color, fontSize: '0.72rem', fontWeight: 700 }}>{r.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  {r.kind === 'fields' ? Object.entries(r.changes || {}).map(([k, v]) => `${k}: ${v}`).join(', ') : `${r.changes?.docType || ''} — ${r.changes?.originalFilename || ''}`}
                </div>
                {r.adminNote && <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '4px' }}>Admin note: {r.adminNote}</div>}
              </div>
            );
          })}
        </div>
      )}

      {editTab && editTab !== 'siblings' && (
        <div style={modalOverlay} onClick={() => !saving && setEditTab(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit {TABS.find((t) => t.key === editTab)?.label}</h3>
            {saveError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</p>}
            {FIELDS_FOR_TAB[editTab].map((f) => (
              <label key={f.key} style={labelStyle}>
                {f.label}{f.locked && <span style={lockBadge}>🔒 requires admin approval</span>}
                {f.type === 'select' ? (
                  <select style={inputStyle} value={editForm[f.key] || ''} onChange={(e) => setEditForm((form) => ({ ...form, [f.key]: e.target.value }))}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'state' ? (
                  editForm.nationality === 'Indian' ? (
                    <select style={inputStyle} value={editForm.birthState || ''} onChange={(e) => {
                      const nextState = e.target.value;
                      setEditForm((form) => ({ ...form, birthState: nextState, birthDistrict: districtsForState(nextState).includes(form.birthDistrict) ? form.birthDistrict : '' }));
                    }}>
                      <option value="">Select state/UT...</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input type="text" style={inputStyle} value={editForm.birthState || ''} onChange={(e) => setEditForm((form) => ({ ...form, birthState: e.target.value }))} />
                  )
                ) : f.type === 'district' ? (
                  editForm.nationality === 'Indian' && editForm.birthState ? (
                    <select style={inputStyle} value={editForm.birthDistrict || ''} onChange={(e) => setEditForm((form) => ({ ...form, birthDistrict: e.target.value }))}>
                      <option value="">Select district...</option>
                      {districtsForState(editForm.birthState).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <input type="text" style={inputStyle} value={editForm.birthDistrict || ''} onChange={(e) => setEditForm((form) => ({ ...form, birthDistrict: e.target.value }))} disabled={editForm.nationality === 'Indian' && !editForm.birthState} placeholder={editForm.nationality === 'Indian' ? 'Select a state first' : ''} />
                  )
                ) : f.type === 'textarea' ? (
                  <textarea style={{ ...inputStyle, minHeight: '60px' }} value={editForm[f.key] || ''} onChange={(e) => setEditForm((form) => ({ ...form, [f.key]: e.target.value }))} />
                ) : (
                  <input type={f.type || 'text'} style={inputStyle} value={editForm[f.key] || ''} onChange={(e) => setEditForm((form) => ({ ...form, [f.key]: e.target.value }))} />
                )}
              </label>
            ))}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" style={btnStyle} onClick={() => setEditTab(null)} disabled={saving}>Cancel</button>
              <button type="button" style={primaryBtnStyle} onClick={submitEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {editTab === 'siblings' && (
        <div style={modalOverlay} onClick={() => !saving && setEditTab(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Siblings</h3>
            {saveError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</p>}
            {siblingRows.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginTop: '10px', alignItems: 'end' }}>
                <label style={labelStyle}>Name
                  <input style={inputStyle} value={s.name} onChange={(e) => setSiblingRows((rows) => rows.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} />
                </label>
                <label style={labelStyle}>Standard
                  <input style={inputStyle} value={s.standard} onChange={(e) => setSiblingRows((rows) => rows.map((r, idx) => idx === i ? { ...r, standard: e.target.value } : r))} />
                </label>
                <label style={labelStyle}>Relation
                  <input style={inputStyle} value={s.relation} onChange={(e) => setSiblingRows((rows) => rows.map((r, idx) => idx === i ? { ...r, relation: e.target.value } : r))} />
                </label>
                <button type="button" style={btnStyle} onClick={() => setSiblingRows((rows) => rows.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" style={{ ...btnStyle, marginTop: '12px' }} onClick={() => setSiblingRows((rows) => [...rows, { name: '', standard: '', relation: '' }])}>+ Add Sibling</button>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" style={btnStyle} onClick={() => setEditTab(null)} disabled={saving}>Cancel</button>
              <button type="button" style={primaryBtnStyle} onClick={submitSiblings} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {guardianEditId && (
        <div style={modalOverlay} onClick={() => !guardianSaving && setGuardianEditId(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Your Guardian Details</h3>
            {guardianError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{guardianError}</p>}
            <label style={labelStyle}>Full Name
              <input style={inputStyle} value={guardianForm.fullName} onChange={(e) => setGuardianForm((f) => ({ ...f, fullName: e.target.value }))} />
            </label>
            <label style={labelStyle}>Mobile
              <input style={inputStyle} value={guardianForm.mobile} onChange={(e) => setGuardianForm((f) => ({ ...f, mobile: e.target.value }))} />
            </label>
            <label style={labelStyle}>Email
              <input style={inputStyle} value={guardianForm.email} onChange={(e) => setGuardianForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label style={labelStyle}>Occupation
              <input style={inputStyle} value={guardianForm.occupation} onChange={(e) => setGuardianForm((f) => ({ ...f, occupation: e.target.value }))} />
            </label>
            <label style={labelStyle}>Qualification
              <input style={inputStyle} value={guardianForm.qualification} onChange={(e) => setGuardianForm((f) => ({ ...f, qualification: e.target.value }))} />
            </label>
            <label style={labelStyle}>Office Address
              <input style={inputStyle} value={guardianForm.officeAddress} onChange={(e) => setGuardianForm((f) => ({ ...f, officeAddress: e.target.value }))} />
            </label>
            <label style={labelStyle}>Home Address
              <input style={inputStyle} value={guardianForm.address} onChange={(e) => setGuardianForm((f) => ({ ...f, address: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" style={btnStyle} onClick={() => setGuardianEditId(null)} disabled={guardianSaving}>Cancel</button>
              <button type="button" style={primaryBtnStyle} onClick={submitGuardian} disabled={guardianSaving}>{guardianSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentStudentProfile;
