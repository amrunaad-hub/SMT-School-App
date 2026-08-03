import React, { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_BADGE = { Pending: { bg: '#fef3c7', color: '#92400e' }, Approved: { bg: '#dcfce7', color: '#166534' }, Rejected: { bg: '#fee2e2', color: '#991b1b' } };
const FIELD_LABELS = {
  firstName: 'First Name', middleName: 'Middle Name', lastName: 'Last Name', dob: 'Date of Birth',
  aadharNumber: 'Aadhar Number', apaarId: 'APAAR ID', grNo: 'GR No', penNo: 'PEN No', studentSaralNo: 'Student SARAL No',
};

const EditRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Pending');

  const [activeRequest, setActiveRequest] = useState(null);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/api/students/edit-requests', statusFilter === 'All' ? {} : { status: statusFilter })
      .then((data) => { setRequests(data.requests || []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const openRequest = (request) => {
    setActiveRequest(request);
    setCurrentStudent(null);
    setRejectNote('');
    setActionError('');
    api.get(`/api/students/${request.studentId}`).then(setCurrentStudent).catch(() => {});
  };

  const approve = async () => {
    setActing(true);
    setActionError('');
    try {
      await api.post(`/api/students/edit-requests/${activeRequest._id}/approve`);
      setActiveRequest(null);
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to approve.');
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    setActing(true);
    setActionError('');
    try {
      await api.post(`/api/students/edit-requests/${activeRequest._id}/reject`, { note: rejectNote });
      setActiveRequest(null);
      load();
    } catch (err) {
      setActionError(err.message || 'Failed to reject.');
    } finally {
      setActing(false);
    }
  };

  const cardStyle = { padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' };
  const btnStyle = { padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 };
  const primaryBtnStyle = { ...btnStyle, background: '#1e40af', color: '#fff', border: '1px solid #1e40af' };
  const dangerBtnStyle = { ...btnStyle, background: '#fff', color: '#991b1b', border: '1px solid #fecaca' };
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' };
  const modalBox = { background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' };
  const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' };

  return (
    <main style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Profile Edit Requests</h2>
      <p style={{ color: '#4b5563', marginTop: 0 }}>Parent-submitted changes to name, DOB, government ID numbers, and documents wait here for approval.</p>

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} style={{ padding: '8px 16px', borderRadius: '999px', border: `1px solid ${statusFilter === s ? '#1e40af' : '#cbd5e1'}`, background: statusFilter === s ? '#1e40af' : '#fff', color: statusFilter === s ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
            {s}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading…</div>}
      {error && <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>{error}</div>}
      {!loading && !error && requests.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No requests here.</div>}

      <div style={{ display: 'grid', gap: '10px' }}>
        {requests.map((r) => {
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.Pending;
          return (
            <div key={r._id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <strong>{r.studentName}</strong> <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({r.studentCode})</span>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {r.kind === 'fields' ? 'Field change' : 'Document'} · requested by {r.requesterUsername} · {new Date(r.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: badge.bg, color: badge.color, fontSize: '0.75rem', fontWeight: 700 }}>{r.status}</span>
                <button type="button" style={btnStyle} onClick={() => openRequest(r)}>Review</button>
              </div>
            </div>
          );
        })}
      </div>

      {activeRequest && (
        <div style={modalOverlay} onClick={() => !acting && setActiveRequest(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{activeRequest.studentName} — {activeRequest.kind === 'fields' ? 'Field Change Request' : 'Document Request'}</h3>
            {actionError && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{actionError}</p>}

            {activeRequest.kind === 'fields' ? (
              <div>
                <div style={{ ...rowStyle, fontWeight: 700, color: '#475569' }}>
                  <div>Field</div><div>Current</div><div>Proposed</div>
                </div>
                {Object.entries(activeRequest.changes || {}).map(([key, value]) => (
                  <div key={key} style={rowStyle}>
                    <div>{FIELD_LABELS[key] || key}</div>
                    <div style={{ color: '#94a3b8' }}>{currentStudent ? (currentStudent[key] || '—') : 'Loading…'}</div>
                    <div style={{ fontWeight: 600 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p><strong>Type:</strong> {activeRequest.changes?.docType}</p>
                <p><strong>File:</strong> {activeRequest.changes?.originalFilename}</p>
                <a href={activeRequest.changes?.fileUrl} target="_blank" rel="noreferrer" style={btnStyle}>View File</a>
              </div>
            )}

            {activeRequest.status === 'Pending' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginTop: '16px' }}>Rejection note (optional, shown to parent)</label>
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} style={{ width: '100%', minHeight: '60px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" style={btnStyle} onClick={() => setActiveRequest(null)} disabled={acting}>Cancel</button>
                  <button type="button" style={dangerBtnStyle} onClick={reject} disabled={acting}>{acting ? 'Working…' : 'Reject'}</button>
                  <button type="button" style={primaryBtnStyle} onClick={approve} disabled={acting}>{acting ? 'Working…' : 'Approve'}</button>
                </div>
              </div>
            ) : (
              <div>
                {activeRequest.adminNote && <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}><strong>Note:</strong> {activeRequest.adminNote}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" style={btnStyle} onClick={() => setActiveRequest(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default EditRequests;
