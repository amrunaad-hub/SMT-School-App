import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const STATUS_COLORS = {
  Scheduled: { bg: '#dbeafe', color: '#1e3a8a' },
  Completed: { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

const TYPE_COLORS = {
  'Unit Test': '#f59e0b',
  'Mid-Term': '#8b5cf6',
  'Final': '#ef4444',
  'Oral': '#06b6d4',
  'Practical': '#10b981',
};

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const params = { academicYear: '2025-26' };
    if (filterGrade) params.grade = filterGrade;
    if (filterStatus) params.status = filterStatus;

    setLoading(true);
    api.get('/api/exams', params)
      .then((data) => {
        setExams(data.exams || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterGrade, filterStatus]);

  const cardStyle = {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    color: 'inherit',
  };

  const formatDate = (dateStr) => (dateStr ? formatDateDMY(dateStr) : '-');

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Exams</h2>
        <p style={{ color: '#4b5563', marginTop: 0 }}>
          Schedule and manage examinations and results.
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', marginTop: '16px' }}>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.88rem' }}
          >
            <option value="">All Grades</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.88rem' }}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading exams...</div>
        )}

        {error && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>
            Failed to load exams: {error}
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No exams found.</div>
        )}

        {!loading && !error && exams.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {exams.map((exam) => {
              const statusStyle = STATUS_COLORS[exam.status] || STATUS_COLORS.Scheduled;
              const typeColor = TYPE_COLORS[exam.type] || '#64748b';
              return (
                <div key={exam._id} style={{ ...cardStyle, borderLeft: `4px solid ${typeColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: '700' }}>{exam.subject}</h3>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {exam.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>{exam.title}</p>
                  <div style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', color: '#64748b' }}>
                    <span>Grade {exam.grade}{exam.division && exam.division !== 'all' ? ` · ${exam.division}` : ' · All Divisions'}</span>
                    <span>Type: <span style={{ color: typeColor, fontWeight: 700 }}>{exam.type}</span></span>
                    <span>Date: {formatDate(exam.scheduledDate)}{exam.scheduledTime ? ` · ${exam.scheduledTime}` : ''}</span>
                    <span>Duration: {exam.durationMinutes} mins · Max Marks: {exam.maxMarks}</span>
                    {exam.venue && <span>Venue: {exam.venue}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Exams;
