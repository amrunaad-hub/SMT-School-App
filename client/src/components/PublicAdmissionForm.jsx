import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DRAFT_STORAGE_KEY = 'smt-school-admission-draft-token';

const STEPS = ['Child', 'Details', 'Guardian', 'Medical', 'Documents', 'Review'];

const EMPTY_FORM = {
  childName: '', dob: '', applyingForGrade: '', enquiryType: 'New Admission', currentSchool: '', area: '',
  parentName: '', parentMobile: '', parentEmail: '', address: '',
  bloodGroup: '', medicalNotes: '',
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
        setForm((f) => ({ ...f, ...data, dob: data.dob ? data.dob.slice(0, 10) : '' }));
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
    e.target.value = '';
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
          page and come back later on the same device.
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
            <label style={labelStyle}>Date of Birth
              <input type="date" style={inputStyle} value={form.dob} onChange={set('dob')} />
            </label>
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
            <label style={labelStyle}>Current/Previous School
              <input style={inputStyle} value={form.currentSchool} onChange={set('currentSchool')} />
            </label>
            <label style={labelStyle}>Area / Locality
              <input style={inputStyle} value={form.area} onChange={set('area')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(0)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['dob', 'applyingForGrade', 'enquiryType', 'currentSchool', 'area'], 2)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label style={labelStyle}>Parent/Guardian Name *
              <input style={inputStyle} value={form.parentName} onChange={set('parentName')} />
            </label>
            <label style={labelStyle}>Mobile Number *
              <input style={inputStyle} value={form.parentMobile} onChange={set('parentMobile')} placeholder="10-digit mobile number" />
            </label>
            <label style={labelStyle}>Email
              <input style={inputStyle} value={form.parentEmail} onChange={set('parentEmail')} />
            </label>
            <label style={labelStyle}>Address
              <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.address} onChange={set('address')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(1)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['parentName', 'parentMobile', 'parentEmail', 'address'], 3)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label style={labelStyle}>Blood Group
              <input style={inputStyle} value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="e.g. O+" />
            </label>
            <label style={labelStyle}>Medical Notes (allergies, conditions, medication)
              <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.medicalNotes} onChange={set('medicalNotes')} />
            </label>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(2)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => saveStep(['bloodGroup', 'medicalNotes'], 4)} disabled={saving}>{saving ? 'Saving…' : 'Next'}</button>
            </div>
          </div>
        )}

        {step === 4 && (
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
              <button type="button" style={secondaryBtn} onClick={() => setStep(3)}>Back</button>
              <button type="button" style={primaryBtn} onClick={() => setStep(5)}>Next</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Review</h3>
            <div style={{ display: 'grid', gap: '6px', fontSize: '0.9rem', color: '#334155' }}>
              <p><strong>Child:</strong> {form.childName} {form.dob ? `(DOB ${form.dob})` : ''}</p>
              <p><strong>Applying for:</strong> Grade {form.applyingForGrade || '—'} · {form.enquiryType}</p>
              <p><strong>Parent/Guardian:</strong> {form.parentName} · {form.parentMobile} {form.parentEmail ? `· ${form.parentEmail}` : ''}</p>
              <p><strong>Documents attached:</strong> {documents.length}</p>
            </div>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={secondaryBtn} onClick={() => setStep(4)}>Back</button>
              <button type="button" style={primaryBtn} onClick={submitApplication} disabled={saving}>{saving ? 'Submitting…' : 'Submit Application'}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default PublicAdmissionForm;
