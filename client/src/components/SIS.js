import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { GRADES, DIVISIONS, searchStudentsByName } from '../data/studentDirectory';

const grades = GRADES;

const EMPTY_FORM = { name: '', mobile: '', grade: '', division: '', photo: null, photoPreview: '' };

const AdmissionModal = ({ onClose }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Student name is required.';
    if (!form.mobile.trim()) e.mobile = 'Parent mobile number is required.';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (!form.grade) e.grade = 'Please select a grade.';
    if (!form.division) e.division = 'Please select a division.';
    if (!form.photo) e.photo = 'Student photo is required.';
    return e;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: file, photoPreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1200);
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.92rem',
    boxSizing: 'border-box',
  };

  const errStyle = { color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' };
  const labelStyle = { display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.9rem' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.28)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: 800, fontSize: '1.15rem' }}>New Student Admission</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h4 style={{ margin: '12px 0 6px', color: '#166534' }}>Admission Registered!</h4>
            <p style={{ color: '#475569', margin: '0 0 8px' }}><strong>{form.name}</strong> has been added to Grade {form.grade} {form.division.charAt(0).toUpperCase() + form.division.slice(1)}.</p>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>This is a demo save — data will be persisted when the backend is connected.</p>
            <button type="button" onClick={onClose} style={{ marginTop: '18px', padding: '10px 24px', borderRadius: '10px', background: '#1e3a8a', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Photo upload */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Student Photo <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '12px', border: '2px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {form.photoPreview ? (
                    <img src={form.photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '1.6rem' }}>📷</span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'inline-block', padding: '8px 14px', borderRadius: '8px', background: '#e0f2fe', color: '#0c4a6e', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
                    {form.photo ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.78rem' }}>JPG or PNG, max 5 MB</p>
                </div>
              </div>
              {errors.photo && <p style={errStyle}>{errors.photo}</p>}
            </div>

            {/* Student Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Student Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((err) => ({ ...err, name: '' })); }}
                placeholder="Full name as per birth certificate"
                style={{ ...fieldStyle, borderColor: errors.name ? '#dc2626' : '#cbd5e1' }}
              />
              {errors.name && <p style={errStyle}>{errors.name}</p>}
            </div>

            {/* Parent Mobile */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Parent Mobile Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => { setForm((f) => ({ ...f, mobile: e.target.value })); setErrors((err) => ({ ...err, mobile: '' })); }}
                placeholder="10-digit mobile number"
                maxLength={10}
                style={{ ...fieldStyle, borderColor: errors.mobile ? '#dc2626' : '#cbd5e1' }}
              />
              {errors.mobile && <p style={errStyle}>{errors.mobile}</p>}
            </div>

            {/* Grade + Division */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Grade <span style={{ color: '#dc2626' }}>*</span></label>
                <select
                  value={form.grade}
                  onChange={(e) => { setForm((f) => ({ ...f, grade: e.target.value })); setErrors((err) => ({ ...err, grade: '' })); }}
                  style={{ ...fieldStyle, borderColor: errors.grade ? '#dc2626' : '#cbd5e1' }}
                >
                  <option value="">Select grade</option>
                  {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                {errors.grade && <p style={errStyle}>{errors.grade}</p>}
              </div>
              <div>
                <label style={labelStyle}>Division <span style={{ color: '#dc2626' }}>*</span></label>
                <select
                  value={form.division}
                  onChange={(e) => { setForm((f) => ({ ...f, division: e.target.value })); setErrors((err) => ({ ...err, division: '' })); }}
                  style={{ ...fieldStyle, borderColor: errors.division ? '#dc2626' : '#cbd5e1' }}
                >
                  <option value="">Select division</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
                {errors.division && <p style={errStyle}>{errors.division}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'default' : 'pointer', marginTop: '6px' }}
            >
              {submitting ? 'Saving…' : 'Register Admission'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const SIS = () => {
  const [studentQuery, setStudentQuery] = useState('');
  const [showAdmission, setShowAdmission] = useState(false);

  const filteredStudents = useMemo(() => {
    return searchStudentsByName(studentQuery, 30);
  }, [studentQuery]);

  const cardStyle = {
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Student Information System (SIS)</h2>
            <p style={{ color: '#4b5563', marginTop: '8px' }}>Select a grade to view divisions and students.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdmission(true)}
            style={{ padding: '11px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(30,64,175,0.3)', transition: 'transform 150ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            + New Student Admission
          </button>
        </div>

        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <SearchBar
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Search student by name (school-wide)"
            maxWidth="500px"
          />
        </div>

        {studentQuery.trim() && (
          <div style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fbff' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e3a8a' }}>Student Search Results</h3>
            {filteredStudents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                {filteredStudents.map((student) => (
                  <Link key={student.id} to={`/sis/student/${student.id}`} style={{ textDecoration: 'none', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                    <strong>{student.name}</strong>
                    <p style={{ margin: '6px 0 0', color: '#64748b' }}>Grade {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)} • Roll {student.rollNo}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>No students found for this name query.</p>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {grades.map((grade) => (
            <Link key={grade} to={`/sis/grade/${grade}`} style={cardStyle}>
              <h3>Grade {grade}</h3>
              <p>3 Divisions: Alpha, Beta, Gamma</p>
            </Link>
          ))}
        </div>
      </section>

      {showAdmission && <AdmissionModal onClose={() => setShowAdmission(false)} />}
    </main>
  );
};

export default SIS;
