import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const RELATIONS = ['Father', 'Mother', 'Guardian', 'Other'];
const DOC_TYPES = ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other'];

const EMPTY_EDIT_FORM = {
  firstName: '', lastName: '', gender: 'Male', dob: '', address: '', status: 'Active',
  isRte: false, isMaharashtrian: false, houseId: '', bloodGroup: '', medicalConditions: '',
  medicalNotes: '', transportRouteId: '', previousSchoolName: '', previousSchoolBoard: '',
  previousGradeCompleted: '',
};

const EMPTY_GUARDIAN_FORM = {
  fullName: '', mobile: '', email: '', relation: 'Guardian', isPrimary: false,
  isEmergencyContact: false, createParentLogin: false,
};

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [houses, setHouses] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [guardianOpen, setGuardianOpen] = useState(false);
  const [guardianForm, setGuardianForm] = useState(EMPTY_GUARDIAN_FORM);
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [guardianError, setGuardianError] = useState('');
  const [newCredentials, setNewCredentials] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Other');

  const loadStudent = useCallback(() => {
    setLoading(true);
    return api.get(`/api/students/${id}`)
      .then((data) => { setStudent(data); setLoading(false); })
      .catch((err) => { setError(err.message || 'Failed to load student profile.'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    loadStudent().then(() => {
      if (cancelled) return;
    });
    api.get('/api/houses').then((d) => !cancelled && setHouses(d.houses || [])).catch(() => {});
    api.get('/api/transport').then((d) => !cancelled && setTransportRoutes(d.routes || [])).catch(() => {});
    return () => { cancelled = true; };
  }, [loadStudent]);

  const openEdit = () => {
    if (!student) return;
    setEditForm({
      firstName: student.firstName || '', lastName: student.lastName || '',
      gender: student.gender || 'Male', dob: student.dob ? student.dob.slice(0, 10) : '',
      address: student.address || '', status: student.status || 'Active',
      isRte: !!student.isRte, isMaharashtrian: !!student.isMaharashtrian,
      houseId: student.houseId || '', bloodGroup: student.bloodGroup || '',
      medicalConditions: student.medicalConditions || '', medicalNotes: student.medicalNotes || '',
      transportRouteId: student.transportRouteId || '', previousSchoolName: student.previousSchoolName || '',
      previousSchoolBoard: student.previousSchoolBoard || '', previousGradeCompleted: student.previousGradeCompleted || '',
    });
    setSaveError('');
    setEditOpen(true);
  };

  const submitEdit = () => {
    setSaving(true);
    setSaveError('');
    api.put(`/api/students/${id}`, {
      ...editForm,
      houseId: editForm.houseId || null,
      transportRouteId: editForm.transportRouteId || null,
    })
      .then(() => { setSaving(false); setEditOpen(false); loadStudent(); })
      .catch((err) => { setSaving(false); setSaveError(err.message || 'Failed to save changes.'); });
  };

  const openGuardianModal = () => {
    setGuardianForm(EMPTY_GUARDIAN_FORM);
    setGuardianError('');
    setNewCredentials(null);
    setGuardianOpen(true);
  };

  const submitGuardian = () => {
    if (!guardianForm.fullName.trim() || !guardianForm.mobile.trim()) {
      setGuardianError('Name and mobile number are required.');
      return;
    }
    setGuardianSaving(true);
    setGuardianError('');
    api.post(`/api/students/${id}/guardians`, guardianForm)
      .then((result) => {
        setGuardianSaving(false);
        if (result.credentials) {
          setNewCredentials(result.credentials);
        } else {
          setGuardianOpen(false);
        }
        loadStudent();
      })
      .catch((err) => { setGuardianSaving(false); setGuardianError(err.message || 'Failed to add guardian.'); });
  };

  const removeGuardian = (guardianId) => {
    if (!window.confirm('Unlink this guardian from the student?')) return;
    api.delete(`/api/students/${id}/guardians/${guardianId}`).then(loadStudent).catch(() => {});
  };

  const handleUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('category', 'student-documents');
    formData.append('ownerType', 'student');
    formData.append('ownerId', id);
    formData.append('docType', uploadDocType);
    formData.append('file', file);

    const token = window.localStorage.getItem('smt-school-token');
    fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      .then((r) => r.json().then((data) => { if (!r.ok) throw new Error(data.message); return data; }))
      .then(() => { setUploading(false); loadStudent(); })
      .catch(() => setUploading(false));
    e.target.value = '';
  };

  const profileStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px',
    maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '14px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  };
  const photoStyle = { width: '150px', height: '150px', borderRadius: '50%', marginBottom: '20px', border: '4px solid #e5e7eb' };
  const detailStyle = { width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' };
  const fieldStyle = { padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' };
  const sectionStyle = { width: '100%', marginTop: '28px' };
  const sectionTitleStyle = { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' };
  const cardStyle = { padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' };
  const btnStyle = { padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem' };
  const primaryBtnStyle = { ...btnStyle, background: '#2563eb', color: '#fff', border: '1px solid #2563eb', fontWeight: 600 };
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' };
  const modalBox = { background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' };
  const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '12px' };

  const grade = student ? student.grade : '';
  const division = student ? student.division : '';

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Previous Menu</button>
          {grade && division && (
            <Link to={`/sis/grade/${grade}/${division}`} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>Back to Student List</Link>
          )}
          <Link to="/sis" style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>SIS Home</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Student Profile</h2>
          {student && <button type="button" style={primaryBtnStyle} onClick={openEdit}>Edit Profile</button>}
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : student ? (
          <div style={profileStyle}>
            <img
              src={student.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student._id}`}
              alt={`${student.firstName} ${student.lastName}`}
              style={photoStyle}
            />
            <h3>{student.firstName} {student.lastName}</h3>
            <p style={{ color: '#64748b', margin: '4px 0 0' }}>{student.studentCode}</p>
            {student.house && (
              <span style={{ marginTop: '8px', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, color: '#fff', background: student.house.colorHex }}>
                {student.house.name} House
              </span>
            )}

            <div style={detailStyle}>
              <div style={fieldStyle}><strong>Roll Number:</strong> {student.rollNo}</div>
              <div style={fieldStyle}><strong>Grade:</strong> Grade {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)}</div>
              <div style={fieldStyle}><strong>Gender:</strong> {student.gender || '—'}</div>
              <div style={fieldStyle}><strong>Date of Birth:</strong> {student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : '—'}</div>
              <div style={fieldStyle}><strong>Admission Year:</strong> {student.admissionYear || '—'}</div>
              <div style={fieldStyle}><strong>Status:</strong> {student.status}</div>
              <div style={fieldStyle}><strong>RTE:</strong> {student.isRte ? 'Yes' : 'No'}</div>
              <div style={fieldStyle}><strong>Maharashtrian:</strong> {student.isMaharashtrian ? 'Yes' : 'No'}</div>
              <div style={fieldStyle}><strong>Address:</strong> {student.address || '—'}</div>
            </div>

            {/* Medical */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Medical</div>
              <div style={detailStyle}>
                <div style={fieldStyle}><strong>Blood Group:</strong> {student.bloodGroup || 'Not on file'}</div>
                <div style={fieldStyle}><strong>Conditions:</strong> {student.medicalConditions || 'None recorded'}</div>
                <div style={fieldStyle}><strong>Notes:</strong> {student.medicalNotes || '—'}</div>
              </div>
            </div>

            {/* Previous school / transport */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Previous School &amp; Transport</div>
              <div style={detailStyle}>
                <div style={fieldStyle}><strong>Previous School:</strong> {student.previousSchoolName || '—'}</div>
                <div style={fieldStyle}><strong>Board:</strong> {student.previousSchoolBoard || '—'}</div>
                <div style={fieldStyle}><strong>Last Grade Completed:</strong> {student.previousGradeCompleted || '—'}</div>
                <div style={fieldStyle}>
                  <strong>Transport Route:</strong> {(transportRoutes.find((r) => r._id === String(student.transportRouteId))?.routeName) || 'Not assigned'}
                </div>
              </div>
              {student.admissionId && (
                <p style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                  <Link to="/admissions" style={{ color: '#2563eb' }}>View originating admission enquiry →</Link>
                </p>
              )}
            </div>

            {/* Guardians */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={sectionTitleStyle}>Guardians</div>
                <button type="button" style={btnStyle} onClick={openGuardianModal}>+ Add Guardian</button>
              </div>
              {(student.guardians || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No guardians on file.</p>
              ) : student.guardians.map((g) => (
                <div key={g.id} style={cardStyle}>
                  <div>
                    <strong>{g.fullName}</strong> — {g.relation}
                    {g.isPrimary && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>PRIMARY</span>}
                    {g.isEmergencyContact && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>EMERGENCY</span>}
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{g.mobile}{g.email ? ` · ${g.email}` : ''}{g.userId ? ' · has login' : ' · no login'}</div>
                  </div>
                  <button type="button" style={btnStyle} onClick={() => removeGuardian(g.id)}>Unlink</button>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={sectionTitleStyle}>Documents</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{ ...btnStyle, display: 'inline-block' }}>
                    {uploading ? 'Uploading…' : 'Upload'}
                    <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              {(student.documents || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No documents uploaded.</p>
              ) : student.documents.map((doc) => (
                <div key={doc.id} style={cardStyle}>
                  <div>
                    <strong>{doc.docType}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{doc.originalFilename}</div>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={btnStyle}>View</a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>Student not found.</p>
        )}
      </section>

      {editOpen && (
        <div style={modalOverlay} onClick={() => !saving && setEditOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Student</h3>
            {saveError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>First Name
                <input style={inputStyle} value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </label>
              <label style={labelStyle}>Last Name
                <input style={inputStyle} value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Gender
                <select style={inputStyle} value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label style={labelStyle}>Date of Birth
                <input type="date" style={inputStyle} value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
              </label>
            </div>
            <label style={labelStyle}>Address
              <input style={inputStyle} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Status
                <select style={inputStyle} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="TC">TC</option>
                  <option value="Detained">Detained</option>
                </select>
              </label>
              <label style={labelStyle}>House
                <select style={inputStyle} value={editForm.houseId} onChange={(e) => setEditForm({ ...editForm, houseId: e.target.value })}>
                  <option value="">Not assigned</option>
                  {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <label style={{ fontSize: '0.85rem' }}>
                <input type="checkbox" checked={editForm.isRte} onChange={(e) => setEditForm({ ...editForm, isRte: e.target.checked })} /> RTE
              </label>
              <label style={{ fontSize: '0.85rem' }}>
                <input type="checkbox" checked={editForm.isMaharashtrian} onChange={(e) => setEditForm({ ...editForm, isMaharashtrian: e.target.checked })} /> Maharashtrian
              </label>
            </div>

            <h4 style={{ marginBottom: 0 }}>Medical</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Blood Group
                <input style={inputStyle} value={editForm.bloodGroup} onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })} placeholder="e.g. O+" />
              </label>
              <label style={labelStyle}>Transport Route
                <select style={inputStyle} value={editForm.transportRouteId} onChange={(e) => setEditForm({ ...editForm, transportRouteId: e.target.value })}>
                  <option value="">Not assigned</option>
                  {transportRoutes.map((r) => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </label>
            </div>
            <label style={labelStyle}>Medical Conditions
              <input style={inputStyle} value={editForm.medicalConditions} onChange={(e) => setEditForm({ ...editForm, medicalConditions: e.target.value })} placeholder="e.g. Asthma, Nut allergy" />
            </label>
            <label style={labelStyle}>Medical Notes
              <textarea style={{ ...inputStyle, minHeight: '60px' }} value={editForm.medicalNotes} onChange={(e) => setEditForm({ ...editForm, medicalNotes: e.target.value })} />
            </label>

            <h4 style={{ marginBottom: 0 }}>Previous School</h4>
            <label style={labelStyle}>School Name
              <input style={inputStyle} value={editForm.previousSchoolName} onChange={(e) => setEditForm({ ...editForm, previousSchoolName: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Board
                <input style={inputStyle} value={editForm.previousSchoolBoard} onChange={(e) => setEditForm({ ...editForm, previousSchoolBoard: e.target.value })} placeholder="e.g. CBSE" />
              </label>
              <label style={labelStyle}>Last Grade Completed
                <input style={inputStyle} value={editForm.previousGradeCompleted} onChange={(e) => setEditForm({ ...editForm, previousGradeCompleted: e.target.value })} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" style={btnStyle} onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
              <button type="button" style={primaryBtnStyle} onClick={submitEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {guardianOpen && (
        <div style={modalOverlay} onClick={() => !guardianSaving && setGuardianOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Guardian</h3>
            {newCredentials ? (
              <div>
                <p style={{ color: '#16a34a', fontWeight: 600 }}>Guardian added with a new parent login. Relay these credentials — they're shown only once:</p>
                <div style={{ ...fieldStyle, fontFamily: 'monospace' }}>
                  Username: {newCredentials.username}<br />
                  Temp Password: {newCredentials.tempPassword}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" style={primaryBtnStyle} onClick={() => setGuardianOpen(false)}>Done</button>
                </div>
              </div>
            ) : (
              <>
                {guardianError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{guardianError}</p>}
                <label style={labelStyle}>Full Name
                  <input style={inputStyle} value={guardianForm.fullName} onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={labelStyle}>Mobile
                    <input style={inputStyle} value={guardianForm.mobile} onChange={(e) => setGuardianForm({ ...guardianForm, mobile: e.target.value })} />
                  </label>
                  <label style={labelStyle}>Email
                    <input style={inputStyle} value={guardianForm.email} onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })} />
                  </label>
                </div>
                <label style={labelStyle}>Relation
                  <select style={inputStyle} value={guardianForm.relation} onChange={(e) => setGuardianForm({ ...guardianForm, relation: e.target.value })}>
                    {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={guardianForm.isPrimary} onChange={(e) => setGuardianForm({ ...guardianForm, isPrimary: e.target.checked })} /> Primary contact
                  </label>
                  <label style={{ fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={guardianForm.isEmergencyContact} onChange={(e) => setGuardianForm({ ...guardianForm, isEmergencyContact: e.target.checked })} /> Emergency contact
                  </label>
                  <label style={{ fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={guardianForm.createParentLogin} onChange={(e) => setGuardianForm({ ...guardianForm, createParentLogin: e.target.checked })} /> Create parent login
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" style={btnStyle} onClick={() => setGuardianOpen(false)} disabled={guardianSaving}>Cancel</button>
                  <button type="button" style={primaryBtnStyle} onClick={submitGuardian} disabled={guardianSaving}>{guardianSaving ? 'Saving…' : 'Add Guardian'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default StudentProfile;
