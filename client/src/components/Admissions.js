import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';

const Admissions = () => {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const detailsRef = useRef(null);

  const [admissions, setAdmissions] = useState([]);
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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/api/admissions', { academicYear: '2025-26' })
      .then((data) => {
        setAdmissions(data.admissions || []);
        if (data.stats) setStats(data.stats);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
                <p style={{ marginTop: '6px', color: '#64748b', fontSize: '0.82rem' }}>Source: {detail.source}</p>
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '18px 16px', color: '#64748b', textAlign: 'center' }}>
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
    </main>
  );
};

export default Admissions;
