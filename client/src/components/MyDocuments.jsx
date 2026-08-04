import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

// Every document the logged-in user has personally uploaded, across every
// place the app accepts an upload (leave-request evidence, notice
// attachments, classwork/homework, student/admission documents) — a single
// "my briefcase" view instead of having to remember which screen each one
// was attached from.
const MyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/api/uploads/mine')
      .then((data) => { setDocuments(data.documents || []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const classifications = ['all', ...new Set(documents.map((d) => d.classification))];
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.classification === filter);

  const cardStyle = { padding: '20px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' };

  return (
    <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <section>
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>📁 My Documents</h2>
        <p style={{ color: '#4b5563', marginTop: 0, marginBottom: '18px' }}>Every document you've uploaded — leave evidence, notice attachments, classwork/homework, and more.</p>

        {classifications.length > 2 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {classifications.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${filter === c ? '#1e40af' : '#cbd5e1'}`, background: filter === c ? '#1e40af' : '#fff', color: filter === c ? '#fff' : '#334155', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        )}

        {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading documents...</div>}
        {error && <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>Failed to load: {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', ...cardStyle }}>No documents uploaded yet.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {filtered.map((doc) => (
              <div key={doc.id} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1e40af', fontSize: '0.7rem', fontWeight: 700 }}>{doc.classification}</span>
                    {doc.contextLabel && <span style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 600 }}>{doc.contextLabel}</span>}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{doc.originalFilename}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Uploaded {formatDateDMY(doc.uploadedAt)}</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #1e40af', background: '#fff', color: '#1e40af', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  ⬇ Download
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default MyDocuments;
