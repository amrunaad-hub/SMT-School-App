import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateDMY } from '../utils/formatDate';

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DRAFT_STORAGE_KEY = 'smt-school-admission-draft-token';
const RELATIONS = ['Father', 'Mother', 'Guardian', 'Other'];
const CONTRIBUTION_AREAS = ['Singing', 'Dance', 'Media', 'Debates', 'Sports', 'Drawing', 'Poetry', 'Other'];

const STEPS = ['Child', 'Birth & Identity', 'Academic', 'Guardians', 'Previous School', 'Siblings', 'Medical', 'Documents', 'Review'];

const emptyGuardian = (relation) => ({
  fullName: '', mobile: '', email: '', relation, qualification: '', occupation: '',
  officeAddress: '', isPrimary: relation === 'Father', isEmergencyContact: true, contributionAreas: [],
});

const EMPTY_FORM = {
  childName: '', dob: '', applyingForGrade: '', enquiryType: 'New Admission', currentSchool: '', area: '',
  address: '', bloodGroup: '', medicalNotes: '',
  // Birth & Identity
  gender: '', middleName: '', birthPlace: '', birthTaluka: '', birthDistrict: '', birthState: '',
  religion: '', caste: '', subCaste: '', category: '', nationality: 'Indian', motherTongue: '',
  heightCm: '', weightKg: '', handicapType: '', studentEmail: '', studentMobile: '',
  aadharNumber: '', apaarId: '', studentSaralNo: '', grNo: '', penNo: '', nativeAddress: '',
  // Previous school
  previousSchoolBoard: '', previousSchoolMedium: '', previousGradeCompleted: '',
  previousSchoolPassYear: '', previousSchoolSeatNumber: '', previousSchoolPercentage: '',
  previousSchoolLcNumber: '', previousSchoolLcDate: '', previousSchoolLeaveDate: '',
  previousSchoolReasonLeave: '', previousSchoolRemarks: '',
  // Guardians (repeatable) and siblings (fixed 2 rows, matching the reference form)
  guardiansDraft: [emptyGuardian('Father'), emptyGuardian('Mother')],
  siblingsDeclared: [{ name: '', standard: '', relation: '' }, { name: '', standard: '', relation: '' }],
};

const req = (method, path, body) => fetch(path, {
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => {
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Request failed');
  return data;
});

const PublicAdmissionForm = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftToken, setDraftToken] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null); // { enquiryCode }
  const [checkingResume, setCheckingResume] = useState(true);

  // Resume an in-progress (or already-submitted) application from a previous visit.
  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) { setCheckingResume(false); return; }
    req('GET', `/api/public/admissions/${stored}`)
      .then((data) => {
        setDraftToken(stored);
        setForm((f) => ({
          ...f,
          ...data,
          dob: data.dob ? data.dob.slice(0, 10) : '',
          guardiansDraft: (data.guardiansDraft && data.guardiansDraft.length) ? data.guardiansDraft : f.guardiansDraft,
          siblingsDeclared: (data.siblingsDeclared && data.siblingsDeclared.length) ? data.siblingsDeclared : f.siblingsDeclared,
        }));
        if (data.isDraft) {
          setStep(1);
        } else {
          setSubmitted({ enquiryCode: data.enquiryCode });
        }
      })
      .catch(() => window.localStorage.removeItem(DRAFT_STORAGE_KEY))
      .finally(() => setCheckingResume(false));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const startDraft = () => {
    if (!form.childName.trim()) { setError("Child's name is required."); return; }
    setSaving(true);
    setError('');
    req('POST', '/api/public/admissions/draft', { childName: form.childName.trim() })
      .then((data) => {
        setDraftToken(data.draftToken);
        window.localStorage.setItem(DRAFT_STORAGE_KEY, data.draftToken);
        setSaving(false);
        setStep(1);
      })
      .catch((err) => { setSaving(false); setError(err.message); });
  };

  const saveStep = (fields, nextStep) => {
    setSaving(true);
    setError('');
    const payload = {};
    fields.forEach((f) => { payload[f] = form[f]; });
    req('PUT', `/api/public/admissions/draft/${draftToken}`, payload)
      .then(() => { setSaving(false); setStep(nextStep); })
      .catch((err) => { setSaving(false); setError(err.message); });
  };

  const updateGuardian = (index, patch) => {
    setForm((f) => {
      const next = [...f.guardiansDraft];
      next[index] = { ...next[index], ...patch };
      return { ...f, guardiansDraft: next };
    });
  };

  const setPrimaryGuardian = (index) => {
    setForm((f) => ({
      ...f,
      guardiansDraft: f.guardiansDraft.map((g, i) => ({ ...g, isPrimary: i === index })),
    }));
  };

  const addGuardian = () => setForm((f) => ({ ...f, guardiansDraft: [...f.guardiansDraft, emptyGuardian('Guardian')] }));
  const removeGuardian = (index) => setForm((f) => ({ ...f, guardiansDraft: f.guardiansDraft.filter((_, i) => i !== index) }));

  const updateSibling = (index, patch) => {
    setForm((f) => {
      const next = [...f.siblingsDeclared];
      next[index] = { ...next[index], ...patch };
      return { ...f, siblingsDeclared: next };
    });
  };

  const handleUpload = (docType) => (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);
    fetch(`/api/public/admissions/${draftToken}/documents`, { method: 'POST', body: formData })
      .then((r) => r.json().then((data) => { if (!r.ok) throw new Error(data.message); return data; }))
      .then((doc) => { setDocuments((d) => [...d, doc]); setUploading(false); })
      .catch((err) => { setUploading(false); setError(err.message); });
    // Deferred, not synchronous — resetting a file input's value inside its
    // own onChange corrupts React's internal value-tracking for that
    // element, silently dropping the next native change event (re-uploading
    // to the same slot a second time stops working). Let React finish first.
    const input = e.target;
    setTimeout(() => { input.value = ''; }, 0);
  };

  const submitApplication = () => {
    setSaving(true);
    setError('');
    req('POST', `/api/public/admissions/draft/${draftToken}/submit`, {})
      .then((data) => {
        setSaving(false);
        setSubmitted({ enquiryCode: data.enquiryCode });
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      })
      .catch((err) => { setSaving(false); setError(err.message); });
  };

  const startOver = () => {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftToken(null);
    setForm(EMPTY_FORM);
    setDocuments([]);
    setSubmitted(null);
    setStep(0);
  };

  const shellStyle = { minHeight: '100vh', padding: '24px 16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 50%, #faf5ff 100%)' };
  const cardStyle = { maxWidth: '640px', margin: '0 auto', background: '#fff', borderRadius: '18px', padding: '28px', boxShadow: '0 14px 30px rgba(15,23,42,0.08)' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', fontSize: '0.92rem' };
  const labelStyle = { display: 'block', fontWeight: 700, color: '#334155', marginTop: '14px', fontSize: '0.88rem' };
  const primaryBtn = { padding: '12px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.92rem' };
  const secondaryBtn = { padding: '12px 22px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem' };
  const smallBtn = { padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' };
  const guardianCard = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginTop: '14px' };

  if (checkingResume) {
    return <main style={shellStyle}><div style={cardStyle}><p style={{ color: '#64748b' }}>Loading…</p></div></main>;
  }

  if (submitted) {
    return (
      <main style={shellStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: '#166534', marginTop: 0 }}>Application Submitted</h2>
          <p>Thank you! Your application reference number is:</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'monospace' }}>{submitted.enquiryCode}</p>
          <p style={{ color: '#475569' }}>The school office will review your application and get in touch. Keep this reference number for follow-up.</p>
          <button type="button" style={secondaryBtn} onClick={startOver}>Submit Another Application</button>
          <p style={{ marginTop: '18px' }}><Link to="/login" style={{ color: '#1d4ed8' }}>← Back to login</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: '#1e3a8a' }}>Admission Application</h2>
        <p style={{ color: '#64748b', marginTop: '4px', marginBottom: '18px', fontSize: '0.88rem' }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}. Your progress is saved automatically — you can close this
          page and come back later on the same device. Fields marked * are required.
        </p>

        {error && <p style={{ color: '#dc2626', fontSize: '0.86rem', marginBottom: '10px' }}>{error}</p>}

        {step === 0 && (
          <div>
            <label style={labelStyle}>Child's Full Name *
              <input style={inputStyle} value={form.childName} onChange={set('childName')} placeholder="As per birth certificate" />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={primaryBtn} onClick={startDraft} disabled={saving}>{saving ? 'Starting…' : 'Start Application'}</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <label style={labelStyle}>Date of Birth *
              <input type="date" style={inputStyle} value={form.dob} onChange={set('dob')} />
            </label>
            <label style={labelStyle}>Gender *
              <select style={inputStyle} value={form.gender} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label style={labelStyle}>Middle Name
              <input style={inputStyle} value={form.middleName} onChange={set('middleName')} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Birth Place
                <input style={inputStyle} value={form.birthPlace} onChange={set('birthPlace')} />
              </label>
              <label style={labelStyle}>Birth Taluka
                <input style={inputStyle} value={form.birthTaluka} onChange={set('birthTaluka')} />
              </label>
              <label style={labelStyle}>Birth District
                <input style={inputStyle} value={form.birthDistrict} onChange={set('birthDistrict')} />
              </label>
              <label style={labelStyle}>Birth State
                <input style={inputStyle} value={form.birthState} onChange={set('birthState')} />
              </label>
              <label style={labelStyle}>Religion
                <input style={inputStyle} value={form.religion} onChange={set('religion')} />
              </label>
              <label style={labelStyle}>Caste
                <input style={inputStyle} value={form.caste} onChange={set('caste')} />
              </label>
              <label style={labelStyle}>Sub-Caste
                <input style={inputStyle} value={form.subCaste} onChange={set('subCaste')} />
              </label>
              <label style={labelStyle}>Category
                <input style={inputStyle} value={form.category} onChange={set('category')} placeholder="e.g. OPEN, OBC, SC, ST, EWS" />
              </label>
              <label style={labelStyle}>Nationality
                <input style={inputStyle} value={form.nationality} onChange={set('nationality')} />
              </label>
              <label style={labelStyle}>Mother Tongue
                <input style={inputStyle} value={form.motherTongue} onChange={set('motherTongue')} />
              </label>
              <label style={labelStyle}>Height (cm)
                <input type="number" style={inputStyle} value={form.heightCm} onChange={set('heightCm')} />
              </label>
              <label style={labelStyle}>Weight (kg)
                <input type="number" style={inputStyle} value={form.weightKg} onChange={set('weightKg')} />
              </label>
              <label style={labelStyle}>Handicap Type
                <input style={inputStyle} value={form.handicapType} onChange={set('handicapType')} />
              </label>
            </div>
            <label style={labelStyle}>Native Address
              <input style={inputStyle} value={form.nativeAddress} onChange={set('nativeAddress')} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Student Email
                <input style={inputStyle} value={form.studentEmail} onChange={set('studentEmail')} />
              </label>
              <label style={labelStyle}>Student Mobile
                <input style={inputStyle} value={form.studentMobile} onChange={set('studentMobile')} />
              </label>
              <label style={labelStyle}>GR No
                <input style={inputStyle} value={form.grNo} onChange={set('grNo')} />
              </label>
              <label style={labelStyle}>Student Saral No
                <input style={inputStyle} value={form.studentSaralNo} onChange={set('studentSaralNo')} />
              </label>
              <label style={labelStyle}>PEN No
                <input style={inputStyle} value={form.penNo} onChange={set('penNo')} />
              </label>
              <label style={labelStyle}>APAAR ID
                <input style={inputStyle} value={form.apaarId} onChange={set('apaarId')} />
              </label>
              <label style={labelStyle}>Aadhar Number
                <input style={inputStyle} value={form.aadharNumber} onChange={set('aadharNumber')} />
              </label>
            </div>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(0)}>Back</button>
              <button
                type="button"
                style={primaryBtn}
                onClick={() => saveStep([
                  'dob', 'gender', 'middleName', 'birthPlace', 'birthTaluka', 'birthDistrict', 'birthState',
                  'religion', 'caste', 'subCaste', 'category', 'nationality', 'motherTongue', 'heightCm',
                  'weightKg', 'handicapType', 'nativeAddress', 'studentEmail', 'studentMobile', 'grNo',
                  'studentSaralNo', 'penNo', 'apaarId', 'aadharNumber',
                ], 2)}
                disabled={saving}
              >{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label style={labelStyle}>Applying For Grade
              <select style={inputStyle} value={form.applyingForGrade} onChange={set('applyingForGrade')}>
                <option value="">Select grade</option>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Application Type
              <select style={inputStyle} value={form.enquiryType} onChange={set('enquiryType')}>
                <option value="New Admission">New Admission</option>
                <option value="Transfer">Transfer</option>
                <option value="Re-Admission">Re-Admission</option>
              </select>
            </label>
            <label style={labelStyle}>Area / Locality
              <input style={inputStyle} value={form.area} onChange={set('area')} />
            </label>
            <label style={labelStyle}>Current / Residential Address
              <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.address} onChange={set('address')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(1)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['applyingForGrade', 'enquiryType', 'area', 'address'], 3)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ color: '#475569', fontSize: '0.85rem' }}>Add parents/guardians below. Pick one as the primary contact — that's who the school will reach first.</p>
            {form.guardiansDraft.map((g, i) => (
              <div key={i} style={guardianCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <select style={{ ...inputStyle, marginTop: 0, width: 'auto' }} value={g.relation} onChange={(e) => updateGuardian(i, { relation: e.target.value })}>
                    {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {form.guardiansDraft.length > 1 && (
                    <button type="button" style={smallBtn} onClick={() => removeGuardian(i)}>Remove</button>
                  )}
                </div>
                <label style={labelStyle}>Full Name {g.isPrimary ? '*' : ''}
                  <input style={inputStyle} value={g.fullName} onChange={(e) => updateGuardian(i, { fullName: e.target.value })} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={labelStyle}>Mobile {g.isPrimary ? '*' : ''}
                    <input style={inputStyle} value={g.mobile} onChange={(e) => updateGuardian(i, { mobile: e.target.value })} placeholder="10-digit mobile number" />
                  </label>
                  <label style={labelStyle}>Email
                    <input style={inputStyle} value={g.email} onChange={(e) => updateGuardian(i, { email: e.target.value })} />
                  </label>
                  <label style={labelStyle}>Qualification
                    <input style={inputStyle} value={g.qualification} onChange={(e) => updateGuardian(i, { qualification: e.target.value })} />
                  </label>
                  <label style={labelStyle}>Occupation
                    <input style={inputStyle} value={g.occupation} onChange={(e) => updateGuardian(i, { occupation: e.target.value })} />
                  </label>
                </div>
                <label style={labelStyle}>Office Address
                  <input style={inputStyle} value={g.officeAddress} onChange={(e) => updateGuardian(i, { officeAddress: e.target.value })} />
                </label>
                <label style={labelStyle}>Areas you could contribute to enrich school life</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {CONTRIBUTION_AREAS.map((area) => (
                    <label key={area} style={{ fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={g.contributionAreas.includes(area)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...g.contributionAreas, area]
                            : g.contributionAreas.filter((a) => a !== area);
                          updateGuardian(i, { contributionAreas: next });
                        }}
                      /> {area}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                  <label style={{ fontSize: '0.82rem' }}>
                    <input type="radio" name="primaryGuardian" checked={!!g.isPrimary} onChange={() => setPrimaryGuardian(i)} /> Primary contact
                  </label>
                  <label style={{ fontSize: '0.82rem' }}>
                    <input type="checkbox" checked={g.isEmergencyContact} onChange={(e) => updateGuardian(i, { isEmergencyContact: e.target.checked })} /> Emergency contact
                  </label>
                </div>
              </div>
            ))}
            <button type="button" style={{ ...smallBtn, marginTop: '12px' }} onClick={addGuardian}>+ Add another guardian</button>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(2)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['guardiansDraft'], 4)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <label style={labelStyle}>Previous / Current School Name *
              <input style={inputStyle} value={form.currentSchool} onChange={set('currentSchool')} />
            </label>
            <label style={labelStyle}>Board *
              <input style={inputStyle} value={form.previousSchoolBoard} onChange={set('previousSchoolBoard')} placeholder="e.g. CBSE, ICSE, Maharashtra State Board — or None" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>Medium
                <input style={inputStyle} value={form.previousSchoolMedium} onChange={set('previousSchoolMedium')} />
              </label>
              <label style={labelStyle}>Last Standard Passed
                <input style={inputStyle} value={form.previousGradeCompleted} onChange={set('previousGradeCompleted')} />
              </label>
              <label style={labelStyle}>Pass Year
                <input style={inputStyle} value={form.previousSchoolPassYear} onChange={set('previousSchoolPassYear')} />
              </label>
              <label style={labelStyle}>Seat Number
                <input style={inputStyle} value={form.previousSchoolSeatNumber} onChange={set('previousSchoolSeatNumber')} />
              </label>
              <label style={labelStyle}>% Marks
                <input type="number" style={inputStyle} value={form.previousSchoolPercentage} onChange={set('previousSchoolPercentage')} />
              </label>
              <label style={labelStyle}>LC Number
                <input style={inputStyle} value={form.previousSchoolLcNumber} onChange={set('previousSchoolLcNumber')} />
              </label>
              <label style={labelStyle}>LC Date
                <input type="date" style={inputStyle} value={form.previousSchoolLcDate} onChange={set('previousSchoolLcDate')} />
              </label>
              <label style={labelStyle}>Leave Date
                <input type="date" style={inputStyle} value={form.previousSchoolLeaveDate} onChange={set('previousSchoolLeaveDate')} />
              </label>
            </div>
            <label style={labelStyle}>Reason for Leaving
              <input style={inputStyle} value={form.previousSchoolReasonLeave} onChange={set('previousSchoolReasonLeave')} />
            </label>
            <label style={labelStyle}>Remarks
              <input style={inputStyle} value={form.previousSchoolRemarks} onChange={set('previousSchoolRemarks')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(3)}>Back</button>
              <button
                type="button"
                style={primaryBtn}
                onClick={() => saveStep([
                  'currentSchool', 'previousSchoolBoard', 'previousSchoolMedium', 'previousGradeCompleted',
                  'previousSchoolPassYear', 'previousSchoolSeatNumber', 'previousSchoolPercentage',
                  'previousSchoolLcNumber', 'previousSchoolLcDate', 'previousSchoolLeaveDate',
                  'previousSchoolReasonLeave', 'previousSchoolRemarks',
                ], 5)}
                disabled={saving}
              >{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <p style={{ color: '#475569', fontSize: '0.85rem' }}>Optional: list any siblings (studying here or elsewhere).</p>
            {form.siblingsDeclared.map((sib, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <label style={labelStyle}>{i + 1}. Name
                  <input style={inputStyle} value={sib.name} onChange={(e) => updateSibling(i, { name: e.target.value })} />
                </label>
                <label style={labelStyle}>Standard
                  <input style={inputStyle} value={sib.standard} onChange={(e) => updateSibling(i, { standard: e.target.value })} />
                </label>
                <label style={labelStyle}>Relation
                  <input style={inputStyle} value={sib.relation} onChange={(e) => updateSibling(i, { relation: e.target.value })} placeholder="e.g. Brother" />
                </label>
              </div>
            ))}
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(4)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['siblingsDeclared'], 6)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <label style={labelStyle}>Blood Group
              <input style={inputStyle} value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="e.g. O+" />
            </label>
            <label style={labelStyle}>Medical Notes (allergies, conditions, medication)
              <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.medicalNotes} onChange={set('medicalNotes')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(5)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['bloodGroup', 'medicalNotes'], 7)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <p style={{ color: '#475569', fontSize: '0.88rem' }}>Optional: attach supporting documents (PDF, JPG, PNG, DOC/DOCX — max 5MB each).</p>
            {['Birth Certificate', 'Transfer Certificate', 'Aadhar', 'Medical Certificate', 'Photo'].map((docType) => (
              <div key={docType} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.9rem' }}>{docType}</span>
                <label style={{ ...secondaryBtn, padding: '6px 12px', fontSize: '0.8rem' }}>
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" onChange={handleUpload(docType)} disabled={uploading} style={{ display: 'none' }} />
                </label>
              </div>
            ))}
            {documents.length > 0 && (
              <p style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: '10px' }}>{documents.length} document(s) attached.</p>
            )}
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(6)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => setStep(8)}>Next</button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Review</h3>
            <div style={{ display: 'grid', gap: '6px', fontSize: '0.9rem', color: '#334155' }}>
              <p><strong>Child:</strong> {form.childName} {form.dob ? `(DOB ${formatDateDMY(form.dob)})` : ''} {form.gender ? `· ${form.gender}` : ''}</p>
              <p><strong>Applying for:</strong> Grade {form.applyingForGrade || '—'} · {form.enquiryType}</p>
              <p><strong>Guardians:</strong> {form.guardiansDraft.filter((g) => g.fullName).length} added{(() => {
                const primary = form.guardiansDraft.find((g) => g.isPrimary);
                return primary && primary.fullName ? ` · Primary: ${primary.fullName} (${primary.relation}) · ${primary.mobile}` : '';
              })()}</p>
              <p><strong>Previous School:</strong> {form.currentSchool || '—'} {form.previousSchoolBoard ? `· ${form.previousSchoolBoard}` : ''}</p>
              <p><strong>Documents attached:</strong> {documents.length}</p>
            </div>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(7)}>Back</button>
              <button type="button" style={primaryBtn} onClick={submitApplication} disabled={saving}>{saving ? 'Submitting…' : 'Submit Application'}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default PublicAdmissionForm;
