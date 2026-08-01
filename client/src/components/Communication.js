import React, { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORY_STYLE = {
  General: { bg: '#f1f5f9', color: '#475569' },
  Academic: { bg: '#dbeafe', color: '#1e3a8a' },
  Fee: { bg: '#fef3c7', color: '#92400e' },
  Event: { bg: '#f3e8ff', color: '#6b21a8' },
  Holiday: { bg: '#dcfce7', color: '#166534' },
  Exam: { bg: '#fce7f3', color: '#9d174d' },
  Urgent: { bg: '#fee2e2', color: '#991b1b' },
};

const PRIORITY_STYLE = {
  Normal: { bg: '#f1f5f9', color: '#475569' },
  High: { bg: '#fef3c7', color: '#92400e' },
  Urgent: { bg: '#fee2e2', color: '#991b1b' },
};

const Communication = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/notices', { isActive: true })
      .then((data) => {
        setNotices(data.notices || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const cardStyle = {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    color: 'inherit',
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Communication</h2>
        <p style={{ color: '#4b5563', marginTop: 0 }}>
          Manage announcements, messages, and notifications.
        </p>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading notices...</div>
        )}

        {error && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>
            Failed to load notices: {error}
          </div>
        )}

        {!loading && !error && notices.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No active notices.</div>
        )}

        {!loading && !error && notices.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
            {notices.map((notice) => {
              const catStyle = CATEGORY_STYLE[notice.category] || CATEGORY_STYLE.General;
              const priStyle = PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal;
              return (
                <div key={notice._id} style={{ ...cardStyle, borderLeft: `4px solid ${catStyle.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: '700', flex: 1 }}>{notice.title}</h3>
                    {notice.priority !== 'Normal' && (
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: priStyle.bg, color: priStyle.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {notice.priority}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: catStyle.bg, color: catStyle.color, fontSize: '0.72rem', fontWeight: 700 }}>
                      {notice.category}
                    </span>
                    {(notice.targetAudience || []).map((aud) => (
                      <span key={aud} style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 600 }}>
                        {aud}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 10px', color: '#475569', fontSize: '0.84rem', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notice.body}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                    <span>Published: {formatDate(notice.publishedAt)}</span>
                    {notice.expiresAt && <span>Expires: {formatDate(notice.expiresAt)}</span>}
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

export default Communication;
