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

const CATEGORIES = Object.keys(CATEGORY_STYLE);
const AUDIENCES = ['all', 'parents', 'teachers', 'students', 'staff'];

const EMPTY_FORM = {
  title: '', body: '', category: 'General', priority: 'Normal',
  targetAudience: ['all'], expiresAt: '',
};

const Communication = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadNotices = () => {
    setLoading(true);
    api.get('/api/notices', showActiveOnly ? { isActive: true } : {})
      .then((data) => {
        setNotices(data.notices || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadNotices, [showActiveOnly]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const toggleAudience = (aud) => {
    setForm((f) => ({
      ...f,
      targetAudience: f.targetAudience.includes(aud)
        ? f.targetAudience.filter((a) => a !== aud)
        : [...f.targetAudience, aud],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setSaveError('Title and body are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/api/notices', {
        ...form,
        targetAudience: form.targetAudience.length ? form.targetAudience : ['all'],
        expiresAt: form.expiresAt || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadNotices();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (notice) => {
    try {
      await api.put(`/api/notices/${notice._id}`, { isActive: !notice.isActive });
      loadNotices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(`Delete notice "${notice.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/notices/${notice._id}`);
      loadNotices();
    } catch (err) {
      setError(err.message);
    }
  };

  const cardStyle = {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    color: 'inherit',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
    fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Communication</h2>
            <p style={{ color: '#4b5563', marginTop: 0 }}>
              Send and manage announcements to parents, teachers, and staff.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
              <input type="checkbox" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} />
              Active only
            </label>
            <button
              type="button"
              onClick={() => { setShowForm((s) => !s); setSaveError(null); }}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: showForm ? '#64748b' : '#1e40af', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {showForm ? '✕ Cancel' : '+ New Notice'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ ...cardStyle, marginTop: '18px', display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. School closed for Diwali" />
            </div>
            <div>
              <label style={labelStyle}>Message *</label>
              <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Full notice text..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {Object.keys(PRIORITY_STYLE).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Expires (optional)</label>
                <input type="date" style={inputStyle} value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Audience</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {AUDIENCES.map((aud) => (
                  <label key={aud} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155', background: form.targetAudience.includes(aud) ? '#dbeafe' : '#f1f5f9', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.targetAudience.includes(aud)} onChange={() => toggleAudience(aud)} />
                    {aud}
                  </label>
                ))}
              </div>
            </div>
            {saveError && <div style={{ color: '#991b1b', fontSize: '0.82rem' }}>{saveError}</div>}
            <div>
              <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading notices...</div>
        )}

        {error && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b', marginTop: '16px' }}>
            Failed to load notices: {error}
          </div>
        )}

        {!loading && !error && notices.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No notices to show.</div>
        )}

        {!loading && !error && notices.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
            {notices.map((notice) => {
              const catStyle = CATEGORY_STYLE[notice.category] || CATEGORY_STYLE.General;
              const priStyle = PRIORITY_STYLE[notice.priority] || PRIORITY_STYLE.Normal;
              return (
                <div key={notice._id} style={{ ...cardStyle, borderLeft: `4px solid ${catStyle.color}`, opacity: notice.isActive ? 1 : 0.55 }}>
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
                    {!notice.isActive && (
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700 }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px', color: '#475569', fontSize: '0.84rem', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notice.body}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                    <span>Published: {formatDate(notice.publishedAt)}</span>
                    {notice.expiresAt && <span>Expires: {formatDate(notice.expiresAt)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => handleDeactivate(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                      {notice.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button type="button" onClick={() => handleDelete(notice)} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
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
