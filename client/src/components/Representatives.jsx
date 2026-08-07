import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { GRADES, DIVISIONS } from './AudiencePicker';

const cardStyle = { padding: '20px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' };
const btnStyle = (bg) => ({ padding: '7px 14px', borderRadius: '8px', border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' });

const RepSlot = ({ title, badge, current, eligible, onAssign, onRemove, removable = true }) => {
  const [selected, setSelected] = useState('');
  useEffect(() => { setSelected(''); }, [eligible]);

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#0f172a' }}>{title}</h4>
        {badge && <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#dbeafe', color: '#1e3a8a', fontSize: '0.72rem', fontWeight: 700 }}>{badge}</span>}
      </div>
      {current ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.88rem' }}>{current.name}</div>
            <div style={{ fontSize: '0.76rem', color: '#4b5563' }}>{current.mobile}</div>
          </div>
          {removable && <button type="button" onClick={onRemove} style={btnStyle('#dc2626')}>Remove</button>}
        </div>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Not assigned.</div>
      )}
      {removable !== false && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ ...inputStyle, minWidth: '220px' }} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{eligible.length ? 'Select a parent...' : 'No eligible parents found'}</option>
            {eligible.map((p) => (
              <option key={p.guardianId} value={p.guardianId}>{p.name} — ward: {p.wardName} ({p.wardDivision})</option>
            ))}
          </select>
          <button type="button" disabled={!selected} onClick={() => onAssign(Number(selected))} style={{ ...btnStyle('#1e40af'), opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'default' }}>
            {current ? 'Reassign' : 'Assign'}
          </button>
        </div>
      )}
    </div>
  );
};

const Representatives = () => {
  const [grade, setGrade] = useState(GRADES[0]);
  const [data, setData] = useState(null);
  const [ptaEligible, setPtaEligible] = useState([]);
  const [divisionEligible, setDivisionEligible] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/api/representatives', { grade }),
      api.get('/api/representatives/eligible', { grade }),
      ...DIVISIONS.map((d) => api.get('/api/representatives/eligible', { grade, division: d })),
    ])
      .then(([reps, ptaEl, ...divEls]) => {
        setData(reps);
        setPtaEligible(ptaEl.parents || []);
        const byDiv = {};
        DIVISIONS.forEach((d, i) => { byDiv[d] = divEls[i].parents || []; });
        setDivisionEligible(byDiv);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [grade]);

  const assignPta = (guardianId) => {
    api.put('/api/representatives/pta', { grade, guardianId }).then(load).catch((err) => setError(err.message));
  };
  const removePta = () => {
    if (!window.confirm('Remove the PTA rep for this grade? This also clears their default class-rep slot.')) return;
    api.delete(`/api/representatives/pta/${grade}`).then(load).catch((err) => setError(err.message));
  };
  const assignClassRep = (division, guardianId) => {
    api.put('/api/representatives/class-rep', { grade, division, guardianId }).then(load).catch((err) => setError(err.message));
  };
  const removeClassRep = (division) => {
    if (!window.confirm(`Remove the class representative for Grade ${grade} ${division}?`)) return;
    api.delete(`/api/representatives/class-rep/${grade}/${division}`).then(load).catch((err) => setError(err.message));
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>PTA &amp; Class Representatives</h2>
      <p style={{ color: '#4b5563', marginTop: 0 }}>
        Assign one PTA rep per grade — they automatically become class rep for their own child's division too — plus one class rep for each of the other two divisions.
      </p>

      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle}>Grade</label>
        <select style={inputStyle} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
          {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>

      {error && <div style={{ padding: '14px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b', marginBottom: '14px' }}>{error}</div>}
      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading...</div>}

      {!loading && data && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <RepSlot
            title={`PTA Rep — Grade ${grade}`}
            current={data.pta}
            eligible={ptaEligible}
            onAssign={assignPta}
            onRemove={removePta}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {data.classReps.map(({ division, rep }) => (
              <RepSlot
                key={division}
                title={`Class Rep — ${division}`}
                badge={rep?.isPtaDefault ? 'Default via PTA' : null}
                current={rep}
                eligible={divisionEligible[division] || []}
                onAssign={(guardianId) => assignClassRep(division, guardianId)}
                onRemove={() => removeClassRep(division)}
                removable={!rep?.isPtaDefault}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

export default Representatives;
