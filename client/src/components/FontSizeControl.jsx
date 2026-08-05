import React, { useEffect, useState } from 'react';

// Multiplies --font-scale (see index.css) on top of the device-appropriate
// base size (16px desktop / 21px mobile) — since every fontSize in this app
// is set in rem, this one CSS variable scales every message/card/label/
// header at once. Persisted so the choice survives navigation and future
// sessions, same as everything else about a login on this app.
export const FONT_SCALE_KEY = 'smt-school-font-scale';
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.4;
const STEP = 0.1;

export const applyStoredFontScale = () => {
  const stored = parseFloat(window.localStorage.getItem(FONT_SCALE_KEY));
  document.documentElement.style.setProperty('--font-scale', Number.isFinite(stored) ? stored : 1);
};

const FontSizeControl = ({ variant = 'dark' }) => {
  const [scale, setScale] = useState(() => {
    const stored = parseFloat(window.localStorage.getItem(FONT_SCALE_KEY));
    return Number.isFinite(stored) ? stored : 1;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', scale);
    window.localStorage.setItem(FONT_SCALE_KEY, String(scale));
  }, [scale]);

  const round = (n) => Math.round(n * 100) / 100;
  const decrease = () => setScale((s) => Math.max(MIN_SCALE, round(s - STEP)));
  const increase = () => setScale((s) => Math.min(MAX_SCALE, round(s + STEP)));

  const isDark = variant === 'dark';
  const btnStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: isDark ? '1px solid rgba(255,255,255,0.5)' : '1px solid #cbd5e1',
    background: isDark ? 'rgba(255,255,255,0.12)' : '#f8fafc',
    color: isDark ? '#fff' : '#334155',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    lineHeight: 1,
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} title="Adjust text size">
      <button type="button" onClick={decrease} disabled={scale <= MIN_SCALE} style={{ ...btnStyle, opacity: scale <= MIN_SCALE ? 0.4 : 1 }} aria-label="Decrease text size">A-</button>
      <button type="button" onClick={increase} disabled={scale >= MAX_SCALE} style={{ ...btnStyle, opacity: scale >= MAX_SCALE ? 0.4 : 1 }} aria-label="Increase text size">A+</button>
    </div>
  );
};

export default FontSizeControl;
