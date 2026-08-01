import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import SearchBar from './SearchBar';

const DEFAULT_TOP_METRICS = [
  { label: 'Overall Attendance', value: '96.0%', trend: '+1.8%', detail: 'Last 7 days avg', link: '/attendance', accent: '#0ea5e9' },
  { label: 'Impromptu Absenteeism', value: '4.2%', trend: '-1.1%', detail: 'Unplanned teacher + student leave', link: '/attendance', accent: '#f97316' },
  { label: 'Fee Collection', value: '₹19.7L', trend: 'April round', detail: 'April installment collected', link: '/finance', accent: '#10b981' },
  { label: 'Class Coverage On Leave', value: '98.2%', trend: '+0.9%', detail: 'Periods successfully substituted', link: '/hr', accent: '#8b5cf6' },
  { label: 'Cleanliness Compliance', value: '91%', trend: '+2.3%', detail: 'Washroom audit rating', link: '/washrooms', accent: '#06b6d4' },
  { label: 'Upcoming Stakeholder Meetings', value: '7', trend: 'Next 14 days', detail: 'PTM, trustees, CBSE', link: '/communication', accent: '#ef4444' },
];

const DEFAULT_KRA_FACTORS = [
  { label: 'Student Attendance Rate', weight: 25, score: 96, color: '#0ea5e9' },
  { label: 'Fee Collection Efficiency', weight: 20, score: 73, color: '#10b981' },
  { label: 'Hygiene & Cleanliness Compliance', weight: 15, score: 91, color: '#06b6d4' },
  { label: 'Teacher Attendance & Punctuality', weight: 15, score: 94, color: '#8b5cf6' },
  { label: 'Academic Completion %', weight: 15, score: 88, color: '#f59e0b' },
  { label: 'Pending Alerts & Escalations', weight: 10, score: 82, color: '#ef4444' },
];

const CommandCenter = () => {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [showKraModal, setShowKraModal] = useState(false);
  const [topMetrics, setTopMetrics] = useState(DEFAULT_TOP_METRICS);
  const [kraFactors, setKraFactors] = useState(DEFAULT_KRA_FACTORS);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!showKraModal) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowKraModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showKraModal]);

  // Fetch real stats from API
  useEffect(() => {
    api.get('/api/command-center/stats')
      .then((data) => {
        if (data.topMetrics && Array.isArray(data.topMetrics)) {
          setTopMetrics(data.topMetrics);
        }
        if (data.kraFactors && Array.isArray(data.kraFactors)) {
          setKraFactors(data.kraFactors);
        }
      })
      .catch(() => {
        // Keep defaults on error
      });
  }, []);

  const weightedScore = kraFactors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0);

  const filteredMetrics = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return topMetrics;
    return topMetrics.filter((m) =>
      `${m.label} ${m.value} ${m.detail}`.toLowerCase().includes(kw)
    );
  }, [query, topMetrics]);

  const cardStyle = {
    padding: isMobile ? '14px' : '18px',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.07)',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    display: 'block',
  };

  return (
    <main style={{ padding: isMobile ? '14px' : '24px', maxWidth: '1260px', margin: '0 auto', background: 'radial-gradient(circle at 12% 4%, #fee2e2 0%, #fff7ed 35%, #eff6ff 100%)', minHeight: 'calc(100vh - 100px)' }}>

      {/* Header banner */}
      <section style={{ border: '1px solid #fda4af', background: 'linear-gradient(130deg, #0f172a 0%, #7f1d1d 45%, #be123c 100%)', borderRadius: '20px', padding: isMobile ? '16px' : '22px', boxShadow: '0 16px 30px rgba(190, 24, 93, 0.24)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: isMobile ? '1.2rem' : '1.55rem', fontWeight: 800 }}>Command Center</h2>
            <p style={{ color: '#fecdd3', marginTop: '6px', marginBottom: '14px', fontWeight: 500, fontSize: '0.9rem' }}>
              Principal KRA cockpit — attendance, finance, continuity, hygiene, academics.
            </p>
          </div>

          {/* KRA Health Score widget */}
          <button
            type="button"
            onClick={() => setShowKraModal(true)}
            title="Click to see score breakdown"
            style={{ padding: '10px 16px', borderRadius: '999px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '0.88rem', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 180ms', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
          >
            KRA Health Score: {Math.round(weightedScore)} / 100 ▾
          </button>
        </div>

        <SearchBar
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search KRA analytics by keyword (e.g. attendance, fees, hygiene)"
          maxWidth="560px"
          inputStyle={{ border: '1px solid #fda4af', background: 'rgba(255,255,255,0.95)' }}
        />
      </section>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginTop: '20px' }}>
        {filteredMetrics.length === 0 ? (
          <p style={{ gridColumn: '1/-1', color: '#64748b', padding: '20px 0' }}>No metrics match your search.</p>
        ) : filteredMetrics.map((metric) => (
          <Link
            key={metric.label}
            to={metric.link}
            style={{ ...cardStyle, borderColor: `${metric.accent}55` }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 14px 28px ${metric.accent}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.07)';
            }}
          >
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.84rem', fontWeight: 600 }}>{metric.label}</p>
            <p style={{ margin: '10px 0 0', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 800, color: '#111827' }}>{metric.value}</p>
            <p style={{ margin: '6px 0 0', color: metric.accent, fontWeight: 700, fontSize: '0.9rem' }}>{metric.trend}</p>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.78rem' }}>{metric.detail}</p>
          </Link>
        ))}
      </div>

      {/* KRA Modal */}
      {showKraModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="KRA Health Score Breakdown"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowKraModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: isMobile ? '20px' : '28px', maxWidth: '560px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>KRA Health Score Breakdown</h3>
              <button type="button" onClick={() => setShowKraModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 18px', color: '#475569', fontSize: '0.88rem' }}>
              Weighted composite score across 6 principal KRAs. Each factor contributes a percentage of the 100-point total.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '18px 28px', borderRadius: '16px', background: 'linear-gradient(135deg, #0f172a 0%, #be123c 100%)', color: '#fff' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>OVERALL SCORE</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, marginTop: '4px' }}>{Math.round(weightedScore)}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>out of 100</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {kraFactors.map((f) => {
                const contribution = (f.score * f.weight) / 100;
                return (
                  <div key={f.label} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>{f.label}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.76rem', color: '#64748b', background: '#e2e8f0', padding: '2px 7px', borderRadius: '999px' }}>weight {f.weight}%</span>
                        <span style={{ fontWeight: 800, color: f.color, fontSize: '0.95rem' }}>{f.score}%</span>
                      </div>
                    </div>
                    <div style={{ height: '7px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ width: `${f.score}%`, height: '100%', background: f.color, transition: 'width 400ms ease' }} />
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '0.76rem', color: '#64748b' }}>
                      Contributes <strong style={{ color: f.color }}>{contribution.toFixed(1)} pts</strong> to final score
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ margin: '16px 0 0', color: '#64748b', fontSize: '0.78rem', textAlign: 'center' }}>
              Formula: Σ (factor score × weight%) = {Math.round(weightedScore)} / 100
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default CommandCenter;
