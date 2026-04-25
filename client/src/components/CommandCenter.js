import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { DEFAULT_ATTENDANCE_DATE, commandCenterAttendanceCards, weeklyAttendanceTrend } from '../data/attendanceAnalytics';

const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const impromptuAbsenceTrend = [8, 7, 6, 5, 4, 3, 4];
const feeCollectionMonthly = [66, 71, 75, 82, 88, 92];

const topMetrics = [
  { label: 'Overall Attendance', value: '96.0%', trend: '+1.8%', detail: 'Last 7 days', link: '/attendance', accent: '#0ea5e9' },
  { label: 'Impromptu Absenteeism', value: '4.2%', trend: '-1.1%', detail: 'Teacher + student sudden leave', link: '/attendance', accent: '#f97316' },
  { label: 'Fee Collection', value: '₹47.2L', trend: '+9.4%', detail: 'Current term collection', link: '/finance', accent: '#10b981' },
  { label: 'Class Coverage On Leave', value: '98.2%', trend: '+0.9%', detail: 'Periods successfully substituted', link: '/hr', accent: '#8b5cf6' },
  { label: 'Cleanliness Compliance', value: '91%', trend: '+2.3%', detail: 'Washroom audit rating', link: '/washrooms', accent: '#06b6d4' },
  { label: 'Upcoming Stakeholder Meetings', value: '7', trend: '+2', detail: 'Next 14 days', link: '/communication', accent: '#ef4444' },
];

const washroomBlocks = [
  { id: 'floor-1-girls', name: 'Floor 1 Girls Washroom', score: 96, pending: 0, lastUpdate: '09:25 AM', cleaningType: 'Mopping' },
  { id: 'floor-1-boys', name: 'Floor 1 Boys Washroom', score: 94, pending: 0, lastUpdate: '09:50 AM', cleaningType: 'Flushing' },
  { id: 'floor-2-girls', name: 'Floor 2 Girls Washroom', score: 93, pending: 0, lastUpdate: '10:25 AM', cleaningType: 'Deep Cleaning' },
  { id: 'floor-2-boys', name: 'Floor 2 Boys Washroom', score: 91, pending: 1, lastUpdate: '10:50 AM', cleaningType: 'Mopping' },
  { id: 'floor-3-girls', name: 'Floor 3 Girls Washroom', score: 92, pending: 0, lastUpdate: '11:25 AM', cleaningType: 'Flushing' },
  { id: 'floor-3-boys', name: 'Floor 3 Boys Washroom', score: 89, pending: 1, lastUpdate: '11:50 AM', cleaningType: 'Deep Cleaning' },
  { id: 'floor-4-girls', name: 'Floor 4 Girls Washroom', score: 90, pending: 0, lastUpdate: '12:25 PM', cleaningType: 'Mopping' },
  { id: 'floor-4-boys', name: 'Floor 4 Boys Washroom', score: 88, pending: 0, lastUpdate: '12:50 PM', cleaningType: 'Flushing' },
  { id: 'floor-5-girls', name: 'Floor 5 Girls Washroom', score: 89, pending: 0, lastUpdate: '01:25 PM', cleaningType: 'Deep Cleaning' },
  { id: 'floor-5-boys', name: 'Floor 5 Boys Washroom', score: 87, pending: 1, lastUpdate: '01:50 PM', cleaningType: 'Mopping' },
  { id: 'floor-6-girls', name: 'Floor 6 Girls Washroom', score: 88, pending: 0, lastUpdate: '02:25 PM', cleaningType: 'Flushing' },
  { id: 'floor-6-boys', name: 'Floor 6 Boys Washroom', score: 86, pending: 1, lastUpdate: '02:50 PM', cleaningType: 'Deep Cleaning' },
];

const classContinuity = [
  { label: 'Teachers On Leave Today', value: 4, color: '#f97316' },
  { label: 'Auto Substitutions Assigned', value: 18, color: '#8b5cf6' },
  { label: 'Classes Merged', value: 1, color: '#e11d48' },
  { label: 'Coverage Success Rate', value: 98, color: '#10b981', suffix: '%' },
];

const examPerformance = [
  { segment: 'Internal Exams Average', value: 84, color: '#2563eb' },
  { segment: 'Board Simulation Average', value: 81, color: '#9333ea' },
  { segment: 'Competition Participation', value: 76, color: '#f97316' },
  { segment: 'Competition Podium Conversion', value: 63, color: '#16a34a' },
];

const upcomingMeetings = [
  { date: '21 Apr • 9:00 AM', title: 'PTM: Grade 7 & 8 Progress Review', with: 'Parents + Class Teachers', priority: 'high' },
  { date: '22 Apr • 11:30 AM', title: 'Trustee Finance & Capex Review', with: 'Trustees + Admin', priority: 'medium' },
  { date: '24 Apr • 8:15 AM', title: 'Teaching Staff Weekly Alignment', with: 'HODs + Coordinators', priority: 'low' },
  { date: '26 Apr • 12:00 PM', title: 'CBSE Compliance Readiness Check', with: 'CBSE Investigators + Principal Office', priority: 'high' },
];

const priorityColor = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#2563eb',
};

const CommandCenter = () => {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cardStyle = {
    padding: isMobile ? '14px' : '16px',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
  };

  const keyword = query.trim().toLowerCase();

  const filteredMetrics = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return topMetrics;
    return topMetrics.filter((metric) => {
      return (`${metric.label} ${metric.value} ${metric.detail}`).toLowerCase().includes(keyword);
    });
  }, [query]);

  const showSection = (tokens) => {
    if (!keyword) return true;
    return tokens.some((token) => token.toLowerCase().includes(keyword));
  };

  return (
    <main style={{ padding: isMobile ? '14px' : '24px', maxWidth: '1260px', margin: '0 auto', background: 'radial-gradient(circle at 12% 4%, #fee2e2 0%, #fff7ed 35%, #eff6ff 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <div style={{ border: '1px solid #fda4af', background: 'linear-gradient(130deg, #0f172a 0%, #7f1d1d 45%, #be123c 100%)', borderRadius: '20px', padding: isMobile ? '14px' : '18px', boxShadow: '0 16px 30px rgba(190, 24, 93, 0.26)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: isMobile ? '1.22rem' : '1.6rem' }}>Smart Dashboard • Command Center</h2>
              <p style={{ color: '#ffe4e6', marginTop: '8px', marginBottom: '10px', fontWeight: 500 }}>
                Principal KRA cockpit: attendance, finance, class continuity, hygiene, academics and governance.
              </p>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', fontWeight: 700, fontSize: '0.85rem' }}>
              KRA Health Score: 88 / 100
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Attendance', 'Fees', 'Leave Coverage', 'Cleanliness', 'Student Outcomes', 'Stakeholder Meetings'].map((chip) => (
              <span key={chip} style={{ padding: '5px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.76rem' }}>{chip}</span>
            ))}
          </div>
          <p style={{ margin: '12px 0 8px', color: '#fecdd3', fontSize: '0.82rem', fontWeight: 600 }}>
            Tip: Search "CBSE", "leave", "washroom", "competition" to jump to the right insights.
          </p>
          <SearchBar
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KRA analytics by keyword"
            maxWidth="520px"
            inputStyle={{ border: '1px solid #fda4af', background: 'rgba(255,255,255,0.95)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginTop: '18px' }}>
          {filteredMetrics.map((metric) => (
            <Link
              key={metric.label}
              to={metric.link}
              style={{ ...cardStyle, borderColor: `${metric.accent}55` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 14px 24px ${metric.accent}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.08)';
              }}
            >
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>{metric.label}</p>
              <p style={{ margin: '10px 0 0', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 800, color: '#111827' }}>{metric.value}</p>
              <p style={{ margin: '6px 0 0', color: metric.accent, fontWeight: 700 }}>{metric.trend}</p>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '0.78rem' }}>{metric.detail}</p>
            </Link>
          ))}
        </div>

        {showSection(['attendance analytics', 'impromptu absenteeism', 'attendance']) && (
          <section style={{ marginTop: '20px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: isMobile ? '14px' : '16px', boxShadow: '0 10px 22px rgba(37, 99, 235, 0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e3a8a' }}>Attendance Analytics</h3>
                <p style={{ margin: '6px 0 10px', color: '#475569', fontSize: '0.86rem' }}>Daily absentee counts with drill-down to grade, division and student profiles.</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                  {commandCenterAttendanceCards.map((card) => (
                    <Link key={card.grade} to={`/attendance?date=${DEFAULT_ATTENDANCE_DATE}&grade=${card.grade}&view=all`} style={{ ...cardStyle, borderColor: '#bfdbfe', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                        <strong style={{ color: '#1e3a8a' }}>{card.label}</strong>
                        <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{card.absent} absent</span>
                      </div>
                      <p style={{ margin: '8px 0 0', color: '#475569', fontSize: '0.8rem' }}>Attendance: {card.attendancePercent}%</p>
                      <p style={{ margin: '6px 0 0', color: '#334155', fontSize: '0.8rem' }}>Highest absentee division: {card.topDivision.label} ({card.topDivision.absent})</p>
                    </Link>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', marginTop: '12px', gap: '8px' }}>
                  {weeklyAttendanceTrend.map((point) => (
                    <Link key={point.date} to={`/attendance?date=${point.date}&view=all`} style={{ textDecoration: 'none', color: 'inherit', borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fbff', padding: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#1e3a8a' }}>{point.label}</div>
                      <div style={{ marginTop: '6px', color: '#334155', fontSize: '0.8rem' }}>Absent: {point.absent}</div>
                      <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.74rem' }}>No intimation: {point.noIntimationCount}</div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '2px 0 10px', color: '#9a3412' }}>Impromptu Absenteeism</h4>
                {impromptuAbsenceTrend.map((value, index) => (
                  <div key={`${value}-${index}`} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.76rem', color: '#9a3412' }}>
                      <span>{weekLabels[index]}</span>
                      <strong>{value} cases</strong>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', background: '#ffedd5', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(value * 10, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #fb923c 0%, #f97316 100%)', transition: 'width 320ms ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {showSection(['fees', 'collection', 'finance']) && (
          <section style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <Link to="/finance" style={{ ...cardStyle, borderColor: '#86efac' }}>
              <h3 style={{ margin: 0, color: '#166534' }}>Fee Collection Analytics</h3>
              <p style={{ margin: '6px 0 12px', color: '#4b5563', fontSize: '0.84rem' }}>Term target achievement and trend.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', alignItems: 'end', minHeight: '120px' }}>
                {feeCollectionMonthly.map((value, idx) => (
                  <div key={`${value}-${idx}`} style={{ textAlign: 'center' }}>
                    <div style={{ height: `${value}px`, maxHeight: '100px', borderRadius: '8px 8px 4px 4px', background: 'linear-gradient(180deg, #34d399 0%, #10b981 100%)', transition: 'height 300ms ease' }} />
                    <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: '#166534' }}>M{idx + 1}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', color: '#166534', fontWeight: 700 }}>92% of term collection target achieved.</p>
            </Link>

            <Link to="/hr" style={{ ...cardStyle, borderColor: '#c4b5fd' }}>
              <h3 style={{ margin: 0, color: '#5b21b6' }}>Teacher Leave & Timetable Continuity</h3>
              <p style={{ margin: '6px 0 10px', color: '#4b5563', fontSize: '0.84rem' }}>Ensure classes run smoothly despite leave.</p>
              {classContinuity.map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px 10px', borderRadius: '10px', background: `${item.color}14` }}>
                  <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{item.label}</span>
                  <strong style={{ color: item.color }}>{item.value}{item.suffix || ''}</strong>
                </div>
              ))}
            </Link>
          </section>
        )}

        {showSection(['washroom', 'cleanliness', 'hygiene']) && (
          <section style={{ marginTop: '16px', background: '#fff', border: '1px solid #a5f3fc', borderRadius: '16px', padding: isMobile ? '14px' : '16px', boxShadow: '0 10px 22px rgba(6, 182, 212, 0.08)' }}>
            <h3 style={{ margin: 0, color: '#155e75' }}>Washroom Cleanliness Live Status</h3>
            <p style={{ margin: '6px 0 12px', color: '#475569', fontSize: '0.84rem' }}>Audit updates from housekeeping supervisors.</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              {washroomBlocks.map((block) => (
                <Link key={block.id} to={`/washrooms/${block.id}`} style={{ ...cardStyle, borderColor: '#a5f3fc', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0f766e', fontSize: '0.9rem' }}>{block.name}</strong>
                    <span style={{ color: block.pending ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>{block.pending ? `${block.pending} pending` : 'No pending'}</span>
                  </div>
                  <p style={{ margin: '7px 0 0', color: '#475569', fontSize: '0.78rem' }}>Cleaning type: {block.cleaningType}</p>
                  <div style={{ marginTop: '8px', height: '9px', borderRadius: '999px', background: '#cffafe', overflow: 'hidden' }}>
                    <div style={{ width: `${block.score}%`, height: '100%', background: 'linear-gradient(90deg, #22d3ee 0%, #06b6d4 100%)', transition: 'width 320ms ease' }} />
                  </div>
                  <p style={{ margin: '7px 0 0', color: '#0f766e', fontWeight: 700, fontSize: '0.8rem' }}>Score: {block.score}% • Last audit: {block.lastUpdate}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {showSection(['performance', 'internal exams', 'competitions', 'students']) && (
          <section style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <Link to="/exams" style={{ ...cardStyle, borderColor: '#93c5fd' }}>
              <h3 style={{ margin: 0, color: '#1d4ed8' }}>Academic Performance Pulse</h3>
              <p style={{ margin: '6px 0 10px', color: '#4b5563', fontSize: '0.84rem' }}>Internal and board-prep performance snapshot.</p>
              {examPerformance.map((item) => (
                <div key={item.segment} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px', color: '#1f2937' }}>
                    <span>{item.segment}</span>
                    <strong style={{ color: item.color }}>{item.value}%</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', background: item.color, transition: 'width 320ms ease' }} />
                  </div>
                </div>
              ))}
            </Link>

            <Link to="/communication" style={{ ...cardStyle, borderColor: '#fecaca' }}>
              <h3 style={{ margin: 0, color: '#9f1239' }}>Upcoming Strategic Meetings</h3>
              <p style={{ margin: '6px 0 10px', color: '#4b5563', fontSize: '0.84rem' }}>Parents, trustees, school admin, staff and CBSE stakeholders.</p>
              {upcomingMeetings.map((meeting) => (
                <div key={`${meeting.date}-${meeting.title}`} style={{ padding: '10px', borderRadius: '10px', borderLeft: `4px solid ${priorityColor[meeting.priority]}`, background: '#fff1f2', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#881337', fontSize: '0.8rem' }}>{meeting.date}</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#1f2937', fontSize: '0.83rem' }}>{meeting.title}</p>
                  <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '0.76rem' }}>With: {meeting.with}</p>
                </div>
              ))}
            </Link>
          </section>
        )}
      </section>
    </main>
  );
};

export default CommandCenter;