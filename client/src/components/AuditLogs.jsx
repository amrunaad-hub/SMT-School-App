import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDateTimeDMY } from '../utils/formatDate';

const EVENT_STYLE = {
  login: { bg: '#dcfce7', color: '#166534', icon: '🔓', label: 'Login' },
  logout: { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Logout' },
  request: { bg: '#dbeafe', color: '#1e3a8a', icon: '✏️', label: 'Change' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'login', label: 'Logins' },
  { key: 'logout', label: 'Logouts' },
  { key: 'request', label: 'Changes' },
];

const bytesToGB = (bytes) => (bytes / (1024 ** 3)).toFixed(1);

const usageColor = (pct) => (pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a');

const UsageBar = ({ label, pct, sub }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>{label}</span>
      <span style={{ fontWeight: 800, color: usageColor(pct), fontSize: '0.95rem' }}>{pct == null ? '—' : `${pct}%`}</span>
    </div>
    <div style={{ height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct || 0, 100)}%`, height: '100%', background: usageColor(pct), transition: 'width 300ms ease' }} />
    </div>
    {sub && <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#64748b' }}>{sub}</p>}
  </div>
);

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [serverStats, setServerStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const loadStats = () => {
      api.get('/api/audit-logs/server-stats')
        .then((data) => { setServerStats(data); setStatsError(''); })
        .catch((err) => setStatsError(err.message || 'Failed to load server stats.'));
    };
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/api/audit-logs', { eventType: filter, search: search.trim() || undefined, limit: 300 })
      .then((data) => setLogs(data.logs || []))
      .catch((err) => setError(err.message || 'Failed to load logs.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const inputStyle = { padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit' };

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <section>
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>🛡️ Server Logs</h2>
        <p style={{ color: '#4b5563', marginTop: 0, marginBottom: '18px' }}>
          Login/logout activity and a brief record of every change made across the app — who, when, and from where.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem' }}>Server Resource Usage</h4>
          {statsError ? (
            <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{statsError}</p>
          ) : !serverStats ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                <UsageBar
                  label="CPU"
                  pct={serverStats.cpu.usagePercent}
                  sub={`${serverStats.cpu.cores} core(s) · load avg ${serverStats.cpu.loadAvg.map((n) => n.toFixed(2)).join(' / ')}`}
                />
                <UsageBar
                  label="Memory"
                  pct={serverStats.memory.usedPercent}
                  sub={`${bytesToGB(serverStats.memory.usedBytes)} GB / ${bytesToGB(serverStats.memory.totalBytes)} GB used`}
                />
                {serverStats.disk.unavailable ? (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    Disk usage unavailable on this OS.
                  </div>
                ) : (
                  <UsageBar
                    label="Disk"
                    pct={serverStats.disk.usedPercent}
                    sub={`${bytesToGB(serverStats.disk.usedBytes)} GB / ${bytesToGB(serverStats.disk.totalBytes)} GB used`}
                  />
                )}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                {serverStats.hostname} · uptime {Math.floor(serverStats.uptimeSeconds / 3600)}h {Math.floor((serverStats.uptimeSeconds % 3600) / 60)}m · refreshes every 15s
              </p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{ padding: '8px 14px', borderRadius: '999px', border: `1px solid ${filter === f.key ? '#1e3a8a' : '#cbd5e1'}`, background: filter === f.key ? '#1e3a8a' : '#fff', color: filter === f.key ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '220px' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, IP, or details..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>Search</button>
            <button type="button" onClick={load} title="Refresh" style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>↻</button>
          </form>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No log entries match this filter.</p>
        ) : isMobile ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {logs.map((log) => {
              const es = EVENT_STYLE[log.eventType] || { bg: '#f1f5f9', color: '#475569', icon: '•', label: log.eventType };
              return (
                <div key={log.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: es.bg, color: es.color, fontWeight: 700, fontSize: '0.72rem' }}>{es.icon} {es.label}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{formatDateTimeDMY(log.createdAt)}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>{log.username || '—'} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({log.role || '—'})</span></p>
                  <p style={{ margin: '3px 0 0', color: '#475569', fontSize: '0.8rem' }}>{log.summary}</p>
                  <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '0.74rem' }}>IP: {log.ipAddress || '—'}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Time</th>
                  <th style={{ padding: '10px 12px' }}>Event</th>
                  <th style={{ padding: '10px 12px' }}>User</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>IP Address</th>
                  <th style={{ padding: '10px 12px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const es = EVENT_STYLE[log.eventType] || { bg: '#f1f5f9', color: '#475569', icon: '•', label: log.eventType };
                  return (
                    <tr key={log.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#475569' }}>{formatDateTimeDMY(log.createdAt)}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: es.bg, color: es.color, fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{es.icon} {es.label}</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{log.username || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{log.role || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{log.ipAddress || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#475569' }}>{log.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default AuditLogs;
