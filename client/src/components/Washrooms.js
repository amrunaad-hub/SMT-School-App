import React from 'react';
import { Link, useParams } from 'react-router-dom';

const floors = [1, 2, 3, 4, 5, 6];
const washroomTypes = ['girls', 'boys'];

const cleaningTypes = ['Mopping', 'Deep Cleaning', 'Flushing', 'Mopping', 'Deep Cleaning', 'Flushing'];
const cleanerNames = ['Sunita Yadav', 'Rakesh Kumar', 'Pooja Sharma', 'Mohan Patel', 'Anita Singh', 'Vikas Rao'];
const issuePool = [
  'No issue reported',
  'Floor disinfectant stock running low',
  'Air freshener cartridge replaced',
  'Flush sensor checked after slow refill',
  'Handwash refill delayed by stores',
  'Wet floor sign missing during last round',
];

const statusPool = ['Excellent', 'Good', 'Watch'];

const generateCleaningHistory = (floor, type, typeIndex) => {
  const history = [];
  const dates = ['18 Apr 2026', '17 Apr 2026', '16 Apr 2026', '15 Apr 2026', '14 Apr 2026'];
  
  dates.forEach((date, dateIdx) => {
    const timeOffset = dateIdx * 3;
    const cleaningHour = (7 + floor + timeOffset) % 24;
    const cleaningMinute = type === 'girls' ? String((10 + dateIdx * 5) % 60).padStart(2, '0') : String((35 + dateIdx * 7) % 60).padStart(2, '0');
    const auditHour = (8 + floor + timeOffset) % 24;
    const auditMinute = type === 'girls' ? String((25 + dateIdx * 3) % 60).padStart(2, '0') : String((50 + dateIdx * 2) % 60).padStart(2, '0');
    
    history.push({
      cleanedAt: `${date}, ${String(cleaningHour).padStart(2, '0')}:${cleaningMinute} ${cleaningHour >= 12 ? 'PM' : 'AM'}`,
      cleanedBy: cleanerNames[(floor + dateIdx + typeIndex) % cleanerNames.length],
      cleaningType: cleaningTypes[(floor + dateIdx + typeIndex) % cleaningTypes.length],
      auditedAt: `${date}, ${String(auditHour).padStart(2, '0')}:${auditMinute} ${auditHour >= 12 ? 'PM' : 'AM'}`,
      auditedBy: floor % 2 === 0 ? 'Neelam Verma' : 'Harish Nair',
      score: Math.max(80, 95 - dateIdx * 2),
      issue: issuePool[(floor + dateIdx + (type === 'girls' ? 0 : 2)) % issuePool.length],
      comments: type === 'girls'
        ? ['Sanitary bin cleared, mirror wiped, and entry area disinfected.', 'Flooring done with disinfectant. All dispensers refilled.', 'Deep cleaning completed. Fresh air circulation checked.', 'Light mopping and quick sanitization done.', 'Full washroom sanitation with odour control applied.'][dateIdx]
        : ['Urinal line flushed, door latches checked, and floor corners scrubbed.', 'All cubicles sanitized. Drain systems checked.', 'Deep cleaning with high-pressure jet applied.', 'Routine mopping and fixture maintenance done.', 'Complete overhaul with odour control measures.'][dateIdx],
    });
  });
  
  return history;
};

const washroomRecords = floors.flatMap((floor) => {
  return washroomTypes.map((type, typeIndex) => {
    const id = `floor-${floor}-${type}`;
    const poolIndex = (floor + typeIndex) % cleaningTypes.length;
    const cleanedHour = 7 + floor;
    const cleanedMinute = type === 'girls' ? '10' : '35';
    const auditHour = 8 + floor;
    const supplyStatus = floor % 3 === 0 && type === 'boys' ? 'Attention needed' : 'In stock';
    const issue = issuePool[(floor + (type === 'girls' ? 0 : 2)) % issuePool.length];
    const status = statusPool[(floor + typeIndex) % statusPool.length];
    const score = Math.max(84, 97 - floor - (typeIndex * 2));

    return {
      id,
      floor,
      type,
      label: `Floor ${floor} ${type === 'girls' ? 'Girls Washroom' : 'Boys Washroom'}`,
      status,
      score,
      cleanedBy: cleanerNames[(floor + typeIndex) % cleanerNames.length],
      cleaningType: cleaningTypes[poolIndex],
      lastCleanedAt: `18 Apr 2026, ${String(cleanedHour).padStart(2, '0')}:${cleanedMinute} ${cleanedHour >= 12 ? 'PM' : 'AM'}`,
      lastAuditAt: `18 Apr 2026, ${String(auditHour).padStart(2, '0')}:${type === 'girls' ? '25' : '50'} ${auditHour >= 12 ? 'PM' : 'AM'}`,
      supervisor: floor % 2 === 0 ? 'Neelam Verma' : 'Harish Nair',
      supplyStatus,
      issue,
      comments: type === 'girls'
        ? 'Sanitary bin cleared, mirror wiped, and entry area disinfected.'
        : 'Urinal line flushed, door latches checked, and floor corners scrubbed.',
      checklist: [
        'Floor and cubicles sanitized',
        'Handwash dispensers checked',
        'Odour control reviewed',
        'Supervisor sign-off captured',
      ],
      cleaningHistory: generateCleaningHistory(floor, type, typeIndex),
    };
  });
});

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

const WashroomOverview = () => {
  const groupedByFloor = floors.map((floor) => ({
    floor,
    entries: washroomRecords.filter((record) => record.floor === floor),
  }));

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
                  const badge = badgeColor[record.status];
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
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};

const detailCardStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '16px',
  padding: '16px',
  background: '#fff',
};

const WashroomDetail = ({ record }) => {
  const badge = badgeColor[record.status];

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
            {record.checklist.map((item) => (
              <div key={item} style={{ borderRadius: '12px', background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...detailCardStyle, marginTop: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>Cleaning & Audit History</h3>
          <p style={{ margin: '8px 0 14px', color: '#475569', fontSize: '0.9rem' }}>Previous 5 cleaning sessions with cleaner details and supervisor audits</p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {record.cleaningHistory.map((history, idx) => (
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

                {history.issue !== 'No issue reported' && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#92400e' }}>
                    <strong>Issue noted:</strong> {history.issue}
                  </div>
                )}
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

  const record = washroomRecords.find((item) => item.id === washroomId);

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

  return <WashroomDetail record={record} />;
};

export default Washrooms;