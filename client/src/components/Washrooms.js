import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

const floors = [1, 2, 3, 4, 5, 6];

const pageStyle = {
  padding: '24px',
  maxWidth: '1280px',
  margin: '0 auto',
  minHeight: 'calc(100vh - 96px)',
};

const surfaceStyle = {
  background: '#ffffff',
  border: '1px solid #bae6fd',
  borderRadius: '18px',
  boxShadow: '0 18px 40px rgba(14, 116, 144, 0.08)',
};

const badgeColor = {
  Excellent: { fg: '#166534', bg: '#dcfce7' },
  Good: { fg: '#0f766e', bg: '#ccfbf1' },
  Watch: { fg: '#9a3412', bg: '#ffedd5' },
};

const PhotoUploadSlot = ({ label, photoData, onUpload }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload({ dataUrl: ev.target.result, timestamp: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) });
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>{label.toUpperCase()}</div>
      {photoData ? (
        <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #a5f3fc' }}>
          <img src={photoData.dataUrl} alt={label} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.65)', color: '#fff', fontSize: '0.68rem', padding: '4px 8px', fontWeight: 600 }}>{photoData.timestamp}</div>
          <label style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '3px 7px', fontSize: '0.7rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
            Change
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '110px', border: '2px dashed #a5f3fc', borderRadius: '10px', background: '#f0fdfa', cursor: 'pointer', gap: '6px' }}>
          <span style={{ fontSize: '1.6rem' }}>📷</span>
          <span style={{ fontSize: '0.76rem', color: '#0f766e', fontWeight: 700 }}>Upload {label}</span>
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
};

const detailCardStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '16px',
  padding: '16px',
  background: '#fff',
};

const WashroomOverview = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/washrooms/latest')
      .then((data) => setRecords(data.records || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groupedByFloor = floors.map((floor) => ({
    floor,
    entries: records.filter((record) => record.floor === floor),
  }));

  if (loading) {
    return (
      <main style={{ ...pageStyle, background: 'linear-gradient(180deg, #ecfeff 0%, #f8fafc 48%, #fefce8 100%)' }}>
        <section style={{ ...surfaceStyle, padding: '22px', textAlign: 'center', color: '#64748b' }}>
          Loading washroom data...
        </section>
      </main>
    );
  }

  return (
    <main style={{ ...pageStyle, background: 'linear-gradient(180deg, #ecfeff 0%, #f8fafc 48%, #fefce8 100%)' }}>
      <section style={{ ...surfaceStyle, padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: '#164e63' }}>Washroom Cleanliness Live Status</h2>
            <p style={{ margin: '8px 0 0', color: '#475569', maxWidth: '720px' }}>
              Live housekeeping supervision across all six floors. Open any portlet to inspect the exact cleaning round, cleaner, audit time, supply blockers, and supervisor notes.
            </p>
          </div>
          <div style={{ minWidth: '220px', padding: '14px 16px', borderRadius: '16px', background: 'linear-gradient(135deg, #0891b2 0%, #155e75 100%)', color: '#fff' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.86 }}>Coverage</div>
            <div style={{ marginTop: '6px', fontSize: '1.8rem', fontWeight: 800 }}>12 / 12</div>
            <div style={{ marginTop: '4px', fontSize: '0.84rem', opacity: 0.92 }}>Girls and boys washrooms tracked on each floor</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '18px' }}>
          {groupedByFloor.map((group) => (
            <section key={group.floor} style={{ border: '1px solid #cffafe', borderRadius: '16px', padding: '14px', background: 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#155e75', fontSize: '1rem' }}>Floor {group.floor}</h3>
                <span style={{ color: '#0f766e', fontWeight: 700, fontSize: '0.8rem' }}>Supervisor rounds active</span>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {group.entries.map((record) => {
                  const badge = badgeColor[record.status] || badgeColor.Good;
                  return (
                    <Link
                      key={record.id}
                      to={`/washrooms/${record.id}`}
                      style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        border: '1px solid #a5f3fc',
                        borderRadius: '14px',
                        padding: '12px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{record.type === 'girls' ? 'Girls Washroom' : 'Boys Washroom'}</strong>
                        <span style={{ padding: '4px 8px', borderRadius: '999px', background: badge.bg, color: badge.fg, fontSize: '0.76rem', fontWeight: 700 }}>{record.status}</span>
                      </div>
                      <div style={{ marginTop: '10px', height: '9px', borderRadius: '999px', overflow: 'hidden', background: '#cffafe' }}>
                        <div style={{ width: `${record.score}%`, height: '100%', background: 'linear-gradient(90deg, #22d3ee 0%, #0891b2 100%)' }} />
                      </div>
                      <div style={{ marginTop: '10px', display: 'grid', gap: '4px', fontSize: '0.8rem', color: '#334155' }}>
                        <span>Last cleaned: {record.lastCleanedAt}</span>
                        <span>Cleaning type: {record.cleaningType}</span>
                        <span>Cleaner: {record.cleanedBy}</span>
                      </div>
                    </Link>
                  );
                })}
                {group.entries.length === 0 && (
                  <div style={{ padding: '12px', color: '#64748b', fontSize: '0.84rem', textAlign: 'center' }}>No data</div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};

const WashroomDetail = ({ washroomId }) => {
  const [record, setRecord] = useState(null);
  const [cleaningHistory, setCleaningHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({});

  useEffect(() => {
    if (!washroomId) return;
    // Parse floor and type from id like "floor-3-girls"
    const parts = washroomId.split('-');
    // format: floor-{n}-{type}
    const floor = parts[1];
    const type = parts[2];

    if (!floor || !type) {
      setLoading(false);
      return;
    }

    api.get(`/api/washrooms/${floor}/${type}/history`, { limit: 5 })
      .then((data) => {
        if (data.record) setRecord(data.record);
        setCleaningHistory(data.cleaningHistory || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [washroomId]);

  const setPhoto = (histIdx, slot, data) => {
    setPhotos((prev) => ({ ...prev, [`${histIdx}-${slot}`]: data }));
  };

  if (loading) {
    return (
      <main style={{ ...pageStyle, background: 'linear-gradient(180deg, #f0fdfa 0%, #f8fafc 46%, #fff7ed 100%)' }}>
        <section style={{ ...surfaceStyle, padding: '22px', textAlign: 'center', color: '#64748b' }}>
          Loading washroom details...
        </section>
      </main>
    );
  }

  if (!record) {
    return (
      <main style={{ ...pageStyle, background: '#f8fafc' }}>
        <section style={{ ...surfaceStyle, padding: '22px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Washroom record not found</h2>
          <p style={{ margin: '10px 0 0', color: '#475569' }}>The selected washroom does not exist in the current supervision list.</p>
          <Link to="/washrooms" style={{ display: 'inline-block', marginTop: '14px', color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>
            Return to washroom overview
          </Link>
        </section>
      </main>
    );
  }

  const badge = badgeColor[record.status] || badgeColor.Good;

  return (
    <main style={{ ...pageStyle, background: 'linear-gradient(180deg, #f0fdfa 0%, #f8fafc 46%, #fff7ed 100%)' }}>
      <section style={{ ...surfaceStyle, padding: '22px' }}>
        <Link to="/washrooms" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
          ← Back to washroom overview
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '14px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#164e63' }}>{record.label}</h2>
            <p style={{ margin: '8px 0 0', color: '#475569' }}>Detailed housekeeping log for the latest completed cleaning round and supervisor audit.</p>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: '999px', background: badge.bg, color: badge.fg, fontWeight: 800 }}>{record.status} • {record.score}%</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '18px' }}>
          <div style={detailCardStyle}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>Last cleaned</div>
            <div style={{ marginTop: '8px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>{record.lastCleanedAt}</div>
            <div style={{ marginTop: '8px', color: '#334155' }}>Cleaning type: <strong>{record.cleaningType}</strong></div>
            <div style={{ marginTop: '6px', color: '#334155' }}>Cleaner: <strong>{record.cleanedBy}</strong></div>
          </div>

          <div style={detailCardStyle}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>Supervisor audit</div>
            <div style={{ marginTop: '8px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>{record.lastAuditAt}</div>
            <div style={{ marginTop: '8px', color: '#334155' }}>Supervisor: <strong>{record.supervisor}</strong></div>
            <div style={{ marginTop: '6px', color: '#334155' }}>Supply status: <strong>{record.supplyStatus}</strong></div>
          </div>

          <div style={detailCardStyle}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>Last round issues</div>
            <div style={{ marginTop: '8px', color: '#0f172a', fontSize: '1.02rem', fontWeight: 700 }}>{record.issue}</div>
            <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.55 }}>{record.comments}</p>
          </div>
        </div>

        <section style={{ ...detailCardStyle, marginTop: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>Cleaning checklist</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '12px' }}>
            {(record.checklist || []).map((item, idx) => (
              <div key={idx} style={{ borderRadius: '12px', background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                {typeof item === 'string' ? item : item.item || item}
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...detailCardStyle, marginTop: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>Cleaning & Audit History</h3>
          <p style={{ margin: '8px 0 14px', color: '#475569', fontSize: '0.9rem' }}>Previous 5 cleaning sessions with cleaner details and supervisor audits</p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {cleaningHistory.length === 0 && (
              <p style={{ color: '#64748b' }}>No cleaning history available.</p>
            )}
            {cleaningHistory.map((history, idx) => (
              <div key={idx} style={{ borderLeft: '4px solid #0891b2', padding: '12px 14px', borderRadius: '8px', background: idx === 0 ? '#f0fdfa' : '#f8fafc', border: idx === 0 ? '1px solid #a5f3fc' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CLEANING SESSION {idx === 0 ? '(Latest)' : ''}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{history.cleanedAt}</div>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '999px', background: history.score >= 90 ? '#dcfce7' : history.score >= 80 ? '#ccfbf1' : '#ffedd5', color: history.score >= 90 ? '#166534' : history.score >= 80 ? '#0f766e' : '#9a3412', fontSize: '0.8rem', fontWeight: 700 }}>
                    Score: {history.score}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CLEANER</div>
                    <div style={{ marginTop: '4px', color: '#0f172a', fontWeight: 600 }}>{history.cleanedBy}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CLEANING TYPE</div>
                    <div style={{ marginTop: '4px', color: '#0f172a', fontWeight: 600 }}>{history.cleaningType}</div>
                  </div>
                </div>

                <div style={{ padding: '8px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>DETAILS</div>
                  <div style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.5 }}>{history.comments}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SUPERVISOR AUDIT</div>
                    <div style={{ marginTop: '4px', color: '#0f172a', fontWeight: 600 }}>{history.auditedAt}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>AUDITOR NAME</div>
                    <div style={{ marginTop: '4px', color: '#0f172a', fontWeight: 600 }}>{history.auditedBy}</div>
                  </div>
                </div>

                {history.issue && history.issue !== 'No issue reported' && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#92400e' }}>
                    <strong>Issue noted:</strong> {history.issue}
                  </div>
                )}

                {/* Before / After photo upload */}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px' }}>CLEANING PHOTOGRAPHS</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <PhotoUploadSlot
                      label="Before Cleaning"
                      photoData={photos[`${idx}-before`] || null}
                      onUpload={(data) => setPhoto(idx, 'before', data)}
                    />
                    <PhotoUploadSlot
                      label="After Cleaning"
                      photoData={photos[`${idx}-after`] || null}
                      onUpload={(data) => setPhoto(idx, 'after', data)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};

const Washrooms = () => {
  const { washroomId } = useParams();

  if (!washroomId) {
    return <WashroomOverview />;
  }

  return <WashroomDetail washroomId={washroomId} />;
};

export default Washrooms;
