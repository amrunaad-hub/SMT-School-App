import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const OPEN_STATUSES = ['Enquiry', 'In Process', 'Document Verification', 'Clarification Requested'];
const RELATIONS = ['Father', 'Mother', 'Guardian', 'Other'];

const emptyGuardian = (overrides = {}) => ({
  fullName: '', mobile: '', email: '', relation: 'Father', isPrimary: false, isEmergencyContact: false, ...overrides,
});

const Admissions = () => {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const detailsRef = useRef(null);

  const [admissions, setAdmissions] = useState([]);
  const [houses, setHouses] = useState([]);
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    enquiries: 0,
    inProcess: 0,
    confirmed: 0,
    rejected: 0,
    byGrade: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionAdmission, setActionAdmission] = useState(null); // { id, mode: 'approve'|'reject'|'clarify' }
  const [approveForm, setApproveForm] = useState({ grade: '', division: '', houseId: '', guardians: [emptyGuardian()] });
  const [rejectReason, setRejectReason] = useState('');
  const [clarifyNote, setClarifyNote] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [approveResult, setApproveResult] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    return api.get('/api/admissions', { academicYear: '2025-26' })
      .then((data) => {
        setAdmissions(data.admissions || []);
        if (data.stats) setStats(data.stats);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { api.get('/api/houses').then((d) => setHouses(d.houses || [])).catch(() => {}); }, []);

  const openApprove = (admission) => {
    setActionAdmission({ id: admission._id, mode: 'approve' });
    setApproveForm({
      grade: String(admission.applyingForGrade || ''),
      division: '',
      houseId: '',
      guardians: [emptyGuardian({ fullName: admission.parentName || '', mobile: admission.parentMobile || '', email: admission.parentEmail || '', isPrimary: true, isEmergencyContact: true })],
    });
    setActionError('');
    setApproveResult(null);
  };

  const openReject = (admission) => {
    setActionAdmission({ id: admission._id, mode: 'reject' });
    setRejectReason('');
    setActionError('');
  };

  const openClarify = (admission) => {
    setActionAdmission({ id: admission._id, mode: 'clarify' });
    setClarifyNote('');
    setActionError('');
  };

  const closeAction = () => { if (!actionSubmitting) { setActionAdmission(null); setApproveResult(null); } };

  const updateGuardian = (index, patch) => {
    setApproveForm((f) => ({
      ...f,
      guardians: f.guardians.map((g, i) => (i === index ? { ...g, ...patch } : (patch.isPrimary ? { ...g, isPrimary: false } : g))),
    }));
  };

  const addGuardianRow = () => setApproveForm((f) => ({ ...f, guardians: [...f.guardians, emptyGuardian({ relation: 'Mother' })] }));
  const removeGuardianRow = (index) => setApproveForm((f) => ({ ...f, guardians: f.guardians.filter((_, i) => i !== index) }));

  const submitApprove = () => {
    if (!approveForm.grade || !approveForm.division) { setActionError('Grade and division are required.'); return; }
    if (approveForm.guardians.some((g) => !g.fullName.trim() || !g.mobile.trim())) { setActionError('Every guardian needs a name and mobile number.'); return; }
    setActionSubmitting(true);
    setActionError('');
    api.post(`/api/admissions/${actionAdmission.id}/approve`, {
      grade: Number(approveForm.grade),
      division: approveForm.division,
      houseId: approveForm.houseId || undefined,
      guardians: approveForm.guardians.map((g) => ({ ...g, createParentLogin: true })),
    })
      .then((result) => { setActionSubmitting(false); setApproveResult(result); reload(); })
      .catch((err) => { setActionSubmitting(false); setActionError(err.message || 'Failed to approve admission.'); });
  };

  const submitReject = () => {
    setActionSubmitting(true);
    setActionError('');
    api.post(`/api/admissions/${actionAdmission.id}/reject`, { reason: rejectReason })
      .then(() => { setActionSubmitting(false); setActionAdmission(null); reload(); })
      .catch((err) => { setActionSubmitting(false); setActionError(err.message || 'Failed to reject admission.'); });
  };

  const submitClarify = () => {
    if (!clarifyNote.trim()) { setActionError('A clarification note is required.'); return; }
    setActionSubmitting(true);
    setActionError('');
    api.post(`/api/admissions/${actionAdmission.id}/request-clarification`, { note: clarifyNote })
      .then(() => { setActionSubmitting(false); setActionAdmission(null); reload(); })
      .catch((err) => { setActionSubmitting(false); setActionError(err.message || 'Failed to request clarification.'); });
  };

  const gradeStats = stats.byGrade || [];

  const enquiryDetails = useMemo(() =>
    admissions
      .filter((a) => !['Rejected'].includes(a.status))
      .map((a) => ({
        id: a._id,
        name: a.childName,
        currentSchool: a.currentSchool || '-',
        grade: `Grade ${a.applyingForGrade}`,
        enquiryType: a.enquiryType,
        area: a.area || '-',
        followUp: a.followUpNote || '-',
        source: a.source,
        status: a.status,
      })),
  [admissions]);

  const rejectedApplications = useMemo(() =>
    admissions
      .filter((a) => a.status === 'Rejected')
      .map((a) => ({
        id: a._id,
        name: a.childName,
        grade: `Grade ${a.applyingForGrade}`,
        reason: a.rejectionReason || 'Not specified',
        status: a.status,
      })),
  [admissions]);

  const sectionStyle = {
    marginTop: '28px',
    padding: '24px',
    borderRadius: '18px',
    background: '#ffffff',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
  };

  const cardStyle = {
    padding: '18px 22px',
    borderRadius: '16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  const handleGradeClick = (grade) => {
    setSelectedGrade(grade);
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const displayedEnquiries = useMemo(
    () => (selectedGrade ? enquiryDetails.filter((detail) => detail.grade === selectedGrade) : enquiryDetails),
    [selectedGrade, enquiryDetails]
  );

  if (loading) {
    return (
      <main style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a' }}>
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading admissions data...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a' }}>
        <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>
          Failed to load admissions: {error}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a', background: 'linear-gradient(to bottom, #f0f9ff 0%, #f9fafb 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ fontSize: '1.8rem', color: '#dc2626', fontWeight: '700', marginBottom: '8px' }}>📝 Admissions Dashboard</h2>
        <p style={{ color: '#475569', marginTop: '8px', fontSize: '1rem', fontWeight: '500' }}>
          📊 Track enquiries, applications in process, confirmed admits, and rejected applications with reasons.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginTop: '20px', padding: isMobile ? '16px' : sectionStyle.padding, background: 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)', border: '2px solid #fecaca' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #fef2f2 0%, #fef9f8 100%)', border: '2px solid #dc2626', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
            <h3 style={{ marginBottom: '10px', color: '#991b1b', fontWeight: '700' }}>📧 Total Enquiries</h3>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#dc2626' }}>{stats.totalEnquiries}</p>
            <p style={{ marginTop: '8px', color: '#7f1d1d' }}>New admission and transfer enquiries received.</p>
          </div>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '2px solid #f59e0b', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)' }}>
            <h3 style={{ marginBottom: '10px', color: '#92400e', fontWeight: '700' }}>⏳ In Process</h3>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{stats.inProcess}</p>
            <p style={{ marginTop: '8px', color: '#7c2d12' }}>Applications pending document verification or interview.</p>
          </div>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)', border: '2px solid #10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
            <h3 style={{ marginBottom: '10px', color: '#166534', fontWeight: '700' }}>✅ Confirmed</h3>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{stats.confirmed}</p>
            <p style={{ marginTop: '8px', color: '#3f6319' }}>Students whose admission has been finalized.</p>
          </div>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)', border: '2px solid #6b7280', boxShadow: '0 4px 12px rgba(107, 114, 128, 0.15)' }}>
            <h3 style={{ marginBottom: '10px', color: '#374151', fontWeight: '700' }}>❌ Rejected</h3>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#6b7280' }}>{stats.rejected}</p>
            <p style={{ marginTop: '8px', color: '#4b5563' }}>Applications rejected with detailed reasons.</p>
          </div>
        </div>
      </section>

      <section style={{ ...sectionStyle, padding: isMobile ? '16px' : sectionStyle.padding, background: 'linear-gradient(135deg, #fff9f0 0%, #fef3e2 100%)', border: '2px solid #fed7aa' }}>
        <h3 style={{ marginBottom: '18px', fontSize: '1.3rem', color: '#ea580c', fontWeight: '700' }}>📊 Grade-wise Admission Funnel</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {gradeStats.map((stat) => (
            <div
              key={stat.grade}
              onClick={() => handleGradeClick(stat.grade)}
              style={{
                ...cardStyle,
                minHeight: '220px',
                cursor: 'pointer',
                background: selectedGrade === stat.grade ? 'linear-gradient(135deg, #fff9f0 0%, #fed7aa 100%)' : cardStyle.background,
                borderColor: selectedGrade === stat.grade ? '#ea580c' : cardStyle.border,
                border: selectedGrade === stat.grade ? '2px solid #ea580c' : '1px solid #e2e8f0',
                transition: 'all 0.3s',
                transform: selectedGrade === stat.grade ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: selectedGrade === stat.grade ? '0 4px 12px rgba(234, 88, 12, 0.2)' : 'none'
              }}
            >
              <h4 style={{ margin: 0, color: '#ea580c', fontWeight: '700' }}>📚 {stat.grade}</h4>
              <p style={{ margin: '10px 0 16px', color: '#64748b' }}>Enquiries · In process · Confirmed · Rejected</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>📧 Enquiries</span>
                  <strong style={{ color: '#dc2626' }}>{stat.enquiries}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>In process</span>
                  <strong>{stat.inProcess}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Confirmed</span>
                  <strong>{stat.confirmed}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rejected</span>
                  <strong>{stat.rejected}</strong>
                </div>
                <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${(stat.confirmed / Math.max(stat.enquiries, 1)) * 100}%`, height: '100%', background: '#22c55e' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {gradeStats.length === 0 && (
          <p style={{ color: '#64748b' }}>No grade-wise data available.</p>
        )}
      </section>

      <section style={{ ...sectionStyle, padding: isMobile ? '16px' : sectionStyle.padding }} ref={detailsRef}>
        <h3 style={{ marginBottom: '18px' }}>Enquiry Details</h3>
        {selectedGrade && (
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ margin: 0, color: '#334155' }}>
              Showing enquiries for <strong>{selectedGrade}</strong>. Click another grade card to filter again.
            </p>
            <button
              type="button"
              onClick={() => setSelectedGrade(null)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              Clear Filter
            </button>
          </div>
        )}
        {isMobile ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {displayedEnquiries.length > 0 ? displayedEnquiries.map((detail) => (
              <article key={detail.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong>{detail.name}</strong>
                  <span style={{ color: '#475569', fontSize: '0.86rem' }}>{detail.grade}</span>
                </div>
                <p style={{ marginTop: '8px', color: '#334155' }}>{detail.currentSchool}</p>
                <p style={{ marginTop: '6px', color: '#475569', fontSize: '0.9rem' }}>{detail.enquiryType} • {detail.area}</p>
                <p style={{ marginTop: '6px', color: '#475569', fontSize: '0.88rem' }}>{detail.followUp}</p>
                <p style={{ marginTop: '6px', color: '#64748b', fontSize: '0.82rem' }}>Source: {detail.source} • Status: {detail.status}</p>
                {OPEN_STATUSES.includes(detail.status) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => openApprove(admissions.find((a) => a._id === detail.id))} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Approve</button>
                    <button type="button" onClick={() => openClarify(admissions.find((a) => a._id === detail.id))} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fff', color: '#92400e', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Clarify</button>
                    <button type="button" onClick={() => openReject(admissions.find((a) => a._id === detail.id))} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Reject</button>
                  </div>
                )}
              </article>
            )) : (
              <p style={{ color: '#64748b' }}>No enquiries found{selectedGrade ? ` for ${selectedGrade}` : ''}.</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Grade</th>
                  <th style={{ padding: '12px 16px' }}>Current School</th>
                  <th style={{ padding: '12px 16px' }}>Reason</th>
                  <th style={{ padding: '12px 16px' }}>Area</th>
                  <th style={{ padding: '12px 16px' }}>Follow-up</th>
                  <th style={{ padding: '12px 16px' }}>Source</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedEnquiries.length > 0 ? (
                  displayedEnquiries.map((detail) => (
                    <tr key={detail.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>{detail.name}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.grade}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.currentSchool}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.enquiryType}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.area}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.followUp}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.source}</td>
                      <td style={{ padding: '14px 16px' }}>{detail.status}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {OPEN_STATUSES.includes(detail.status) && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => openApprove(admissions.find((a) => a._id === detail.id))} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Approve</button>
                            <button type="button" onClick={() => openClarify(admissions.find((a) => a._id === detail.id))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fff', color: '#92400e', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Clarify</button>
                            <button type="button" onClick={() => openReject(admissions.find((a) => a._id === detail.id))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ padding: '18px 16px', color: '#64748b', textAlign: 'center' }}>
                      No enquiries found{selectedGrade ? ` for ${selectedGrade}` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ ...sectionStyle, padding: isMobile ? '16px' : sectionStyle.padding }}>
        <h3 style={{ marginBottom: '18px' }}>Rejected Applications</h3>
        {rejectedApplications.length === 0 ? (
          <p style={{ color: '#64748b' }}>No rejected applications.</p>
        ) : isMobile ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {rejectedApplications.map((app) => (
              <article key={app.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#fff' }}>
                <strong>{app.name}</strong>
                <p style={{ marginTop: '6px', color: '#475569' }}>{app.grade}</p>
                <p style={{ marginTop: '6px', color: '#334155' }}>{app.reason}</p>
                <p style={{ marginTop: '6px', color: '#dc2626', fontWeight: 600 }}>{app.status}</p>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Grade</th>
                  <th style={{ padding: '12px 16px' }}>Reason for Rejection</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rejectedApplications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 16px' }}>{app.name}</td>
                    <td style={{ padding: '14px 16px' }}>{app.grade}</td>
                    <td style={{ padding: '14px 16px' }}>{app.reason}</td>
                    <td style={{ padding: '14px 16px', color: '#dc2626' }}>{app.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {actionAdmission && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={closeAction}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {actionError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{actionError}</p>}

            {actionAdmission.mode === 'approve' && (
              approveResult ? (
                <div>
                  <h3 style={{ marginTop: 0, color: '#166534' }}>Admission Approved</h3>
                  <p>{approveResult.student.firstName} {approveResult.student.lastName} is now enrolled as <strong>{approveResult.student.studentCode}</strong>.</p>
                  {approveResult.generatedCredentials.length > 0 ? (
                    <>
                      <p style={{ fontWeight: 600 }}>New parent logins were created — relay these to the family, they're shown only once:</p>
                      {approveResult.generatedCredentials.map((c) => (
                        <div key={c.username} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', fontFamily: 'monospace', marginBottom: '8px' }}>
                          {c.guardianName}: {c.username} / {c.tempPassword}
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ color: '#64748b' }}>All linked guardians already had a login — no new credentials to relay.</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="button" onClick={closeAction} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginTop: 0 }}>Approve Admission</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Grade
                      <select value={approveForm.grade} onChange={(e) => setApproveForm((f) => ({ ...f, grade: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                        <option value="">Select</option>
                        {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Division
                      <select value={approveForm.division} onChange={(e) => setApproveForm((f) => ({ ...f, division: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                        <option value="">Select</option>
                        {DIVISIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>House
                      <select value={approveForm.houseId} onChange={(e) => setApproveForm((f) => ({ ...f, houseId: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                        <option value="">Auto</option>
                        {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                    <h4 style={{ margin: 0 }}>Guardians</h4>
                    <button type="button" onClick={addGuardianRow} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.78rem' }}>+ Add Guardian</button>
                  </div>
                  {approveForm.guardians.map((g, i) => (
                    <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input placeholder="Full name" value={g.fullName} onChange={(e) => updateGuardian(i, { fullName: e.target.value })} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1' }} />
                        <input placeholder="Mobile" value={g.mobile} onChange={(e) => updateGuardian(i, { mobile: e.target.value })} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                        <input placeholder="Email" value={g.email} onChange={(e) => updateGuardian(i, { email: e.target.value })} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1' }} />
                        <select value={g.relation} onChange={(e) => updateGuardian(i, { relation: e.target.value })} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid #cbd5e1' }}>
                          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={g.isPrimary} onChange={(e) => updateGuardian(i, { isPrimary: e.target.checked })} /> Primary</label>
                        <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={g.isEmergencyContact} onChange={(e) => updateGuardian(i, { isEmergencyContact: e.target.checked })} /> Emergency contact</label>
                        {approveForm.guardians.length > 1 && (
                          <button type="button" onClick={() => removeGuardianRow(i)} style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.76rem' }}>Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>A parent login is created automatically for any guardian who doesn't already have one.</p>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
                    <button type="button" onClick={closeAction} disabled={actionSubmitting} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                    <button type="button" onClick={submitApprove} disabled={actionSubmitting} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{actionSubmitting ? 'Approving…' : 'Approve & Enroll'}</button>
                  </div>
                </div>
              )
            )}

            {actionAdmission.mode === 'reject' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Reject Admission</h3>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Reason
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={closeAction} disabled={actionSubmitting} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={submitReject} disabled={actionSubmitting} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{actionSubmitting ? 'Rejecting…' : 'Reject'}</button>
                </div>
              </div>
            )}

            {actionAdmission.mode === 'clarify' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Request Clarification</h3>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Note to family
                  <textarea value={clarifyNote} onChange={(e) => setClarifyNote(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" onClick={closeAction} disabled={actionSubmitting} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={submitClarify} disabled={actionSubmitting} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{actionSubmitting ? 'Sending…' : 'Send'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Admissions;
