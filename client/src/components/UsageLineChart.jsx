import React, { useMemo, useRef, useState } from 'react';

// Hand-rolled SVG line chart — this app has no charting library, and a 2-
// series 0-100% time series doesn't warrant adding one. Follows the dataviz
// skill's core rules: one axis (both series share the same 0-100% scale),
// fixed categorical color order (slot 1 blue = Total, slot 2 orange = App),
// thin 2px lines, recessive gridlines, a legend (2 series), and a hover
// crosshair + tooltip rather than a label on every point.
const COLOR_TOTAL = '#2a78d6'; // categorical slot 1
const COLOR_APP = '#eb6834';   // categorical slot 2
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';
const INK = '#0b0b0b';

const UsageLineChart = ({ title, points, totalKey, appKey, peakKey, formatBucket }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const width = 640;
  const height = 200;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const n = points.length;
  const xFor = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v) => padT + plotH - (Math.max(0, Math.min(100, v || 0)) / 100) * plotH;

  const pathFor = (key) => {
    let d = '';
    points.forEach((p, i) => {
      if (p[key] == null) return;
      d += `${d ? 'L' : 'M'}${xFor(i).toFixed(1)},${yFor(p[key]).toFixed(1)} `;
    });
    return d.trim();
  };

  const handleMove = (e) => {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((relX - padL) / plotW) * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  };

  const gridLines = [0, 25, 50, 75, 100];
  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null;

  if (n === 0) {
    return (
      <div style={{ background: '#fcfcfb', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <span style={{ fontWeight: 700, color: INK, fontSize: '0.86rem' }}>{title}</span>
        <p style={{ margin: '10px 0 0', color: MUTED, fontSize: '0.8rem' }}>No history yet for this range.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fcfcfb', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 700, color: INK, fontSize: '0.86rem' }}>{title}</span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem', color: '#52514e' }}>
          <span><span style={{ display: 'inline-block', width: '10px', height: '2px', background: COLOR_TOTAL, marginRight: '5px', verticalAlign: 'middle' }} />Total</span>
          <span><span style={{ display: 'inline-block', width: '10px', height: '2px', background: COLOR_APP, marginRight: '5px', verticalAlign: 'middle' }} />App</span>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        {gridLines.map((g) => (
          <g key={g}>
            <line x1={padL} x2={width - padR} y1={yFor(g)} y2={yFor(g)} stroke={GRID} strokeWidth="1" />
            <text x={padL - 6} y={yFor(g) + 3} textAnchor="end" fontSize="9" fill={MUTED}>{g}</text>
          </g>
        ))}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke={AXIS} strokeWidth="1" />
        <line x1={padL} x2={width - padR} y1={padT + plotH} y2={padT + plotH} stroke={AXIS} strokeWidth="1" />

        {peakKey && <path d={pathFor(peakKey)} fill="none" stroke={COLOR_TOTAL} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="3,2" />}
        <path d={pathFor(totalKey)} fill="none" stroke={COLOR_TOTAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathFor(appKey)} fill="none" stroke={COLOR_APP} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hoverIdx != null && (
          <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={padT} y2={padT + plotH} stroke={AXIS} strokeWidth="1" strokeDasharray="2,2" />
        )}
        {hoverIdx != null && points[hoverIdx][totalKey] != null && (
          <circle cx={xFor(hoverIdx)} cy={yFor(points[hoverIdx][totalKey])} r="3" fill={COLOR_TOTAL} />
        )}
        {hoverIdx != null && points[hoverIdx][appKey] != null && (
          <circle cx={xFor(hoverIdx)} cy={yFor(points[hoverIdx][appKey])} r="3" fill={COLOR_APP} />
        )}
      </svg>

      {hoverPoint && (
        <div style={{ position: 'absolute', top: '38px', right: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.76rem', boxShadow: '0 4px 10px rgba(15,23,42,0.1)', pointerEvents: 'none' }}>
          <div style={{ color: MUTED, marginBottom: '2px' }}>{formatBucket(hoverPoint.bucket)}</div>
          <div style={{ color: COLOR_TOTAL, fontWeight: 700 }}>Total: {hoverPoint[totalKey] ?? '—'}%</div>
          <div style={{ color: COLOR_APP, fontWeight: 700 }}>App: {hoverPoint[appKey] ?? '—'}%</div>
        </div>
      )}
    </div>
  );
};

export default UsageLineChart;
