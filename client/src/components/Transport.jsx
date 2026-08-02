import React, { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_STYLE = {
  Active: { bg: '#dcfce7', color: '#166534' },
  Inactive: { bg: '#fee2e2', color: '#991b1b' },
};

const Transport = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/transport')
      .then((data) => {
        setRoutes(data.routes || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Transport</h2>
        <p style={{ color: '#4b5563', marginTop: 0 }}>
          Manage school transport and routes.
        </p>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading transport routes...</div>
        )}

        {error && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>
            Failed to load transport routes: {error}
          </div>
        )}

        {!loading && !error && routes.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No transport routes found.</div>
        )}

        {!loading && !error && routes.length > 0 && (
          <>
            <div style={{ marginBottom: '16px', marginTop: '16px', padding: '12px 18px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'inline-flex', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '0.9rem' }}>
                Total Routes: <strong>{routes.length}</strong>
              </span>
              <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '0.9rem' }}>
                Active: <strong>{routes.filter((r) => r.status === 'Active').length}</strong>
              </span>
              <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '0.9rem' }}>
                Total Occupancy: <strong>{routes.reduce((s, r) => s + (r.currentOccupancy || 0), 0)}</strong> students
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '12px' }}>
              {routes.map((route) => {
                const statusStyle = STATUS_STYLE[route.status] || STATUS_STYLE.Active;
                const occupancyPct = route.capacity > 0
                  ? Math.round((route.currentOccupancy / route.capacity) * 100)
                  : 0;
                return (
                  <div key={route._id} style={{ ...cardStyle, borderLeft: '4px solid #0ea5e9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: '700' }}>{route.routeName}</h3>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{route.routeCode}</span>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {route.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '5px', fontSize: '0.82rem', color: '#475569' }}>
                      <span>🚌 Vehicle: <strong style={{ color: '#0f172a' }}>{route.vehicleNumber || '-'}</strong></span>
                      <span>👨‍✈️ Driver: <strong style={{ color: '#0f172a' }}>{route.driverName || '-'}</strong>{route.driverPhone ? ` · ${route.driverPhone}` : ''}</span>
                      <span>🕐 Departure: <strong>{route.morningDepartureTime || '-'}</strong> AM / <strong>{route.eveningDepartureTime || '-'}</strong> PM</span>
                      <span>🛑 Stops: <strong>{(route.stops || []).length}</strong></span>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                        <span>Occupancy</span>
                        <span><strong style={{ color: '#0f172a' }}>{route.currentOccupancy}</strong> / {route.capacity} ({occupancyPct}%)</span>
                      </div>
                      <div style={{ height: '7px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${occupancyPct}%`, height: '100%', background: occupancyPct > 90 ? '#ef4444' : '#0ea5e9', transition: 'width 400ms' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default Transport;
