import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDateKey, isSameDate, generateCalendarDays } from '../utils/calendarHelpers';

const SUBJECTS_G1_G4 = [
  'Library', 'Maths', 'EVS', 'English', 'Hindi', 'Marathi', 'Yoga', 'Gym', 'Cyber / Computer',
];

const DIVISION_ORDER = ['alpha', 'beta', 'gamma'];
const DIVISION_LABEL = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };

// Real school day structure: 1:00 PM - 5:30 PM, 30 min/period, one long and
// one short break — matches the `periods` arrays written by
// server/utils/seedSchoolData.js-adjacent one-off timetable population.
const TIME_SLOTS = [
  '1:00-1:05', '1:05-1:15', '1:15-1:45', '1:45-2:15', '2:15-2:45',
  '2:45-3:05', '3:05-3:35', '3:35-4:05', '4:05-4:15', '4:15-4:45',
  '4:45-5:15', '5:15-5:30',
];

const formatDateLabel = (date) => {
  return date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
};

const getAcademicYearLabel = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const getSaturdayOccurrence = (date) => Math.floor((date.getDate() - 1) / 7) + 1;

const getOperationalDayStatus = (date) => {
  const day = date.getDay();
  const monthName = date.toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  if (day === 0) {
    return { isWorkingDay: false, label: 'Sunday Off', detail: `All Sundays are marked as non-working days. ${formatDateLabel(date)} is a holiday.` };
  }
  if (day === 6) {
    const occurrence = getSaturdayOccurrence(date);
    if (occurrence === 2 || occurrence === 4) {
      return { isWorkingDay: false, label: `${occurrence}${occurrence === 2 ? 'nd' : 'th'} Saturday Off`, detail: `${occurrence}${occurrence === 2 ? 'nd' : 'th'} Saturday in ${monthName} is a holiday as per timetable policy.` };
    }
    return { isWorkingDay: true, label: `${occurrence}${occurrence === 1 ? 'st' : occurrence === 3 ? 'rd' : 'th'} Saturday Working`, detail: `${occurrence}${occurrence === 1 ? 'st' : occurrence === 3 ? 'rd' : 'th'} Saturday is a full working timetable day.` };
  }
  return { isWorkingDay: true, label: 'Regular Working Day', detail: 'Regular weekday timetable is active.' };
};

// Convert day.getDay() (0=Sun, 1=Mon..6=Sat) to our dayOfWeek (1=Mon..6=Sat)
const jsDayToApiDay = (jsDay) => {
  if (jsDay === 0) return null; // Sunday
  return jsDay; // Mon=1, Tue=2, ... Sat=6
};

// "Ms. Anuja Kulkarni" -> "AK" — drops common titles, initials of what's left.
const getInitials = (name) => {
  if (!name) return '';
  const words = name.replace(/\b(Mr|Mrs|Ms|Dr|Miss)\.?/gi, '').trim().split(/\s+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase()).join('').slice(0, 3);
};

// Build consolidated timetable object from API docs
const buildTimetableFromDocs = (docs) => {
  const timetable = {};
  const grades = [1, 2, 3, 4];
  grades.forEach((grade) => {
    DIVISION_ORDER.forEach((div) => {
      const className = `Grade ${grade} ${DIVISION_LABEL[div]}`;
      const doc = docs.find((d) => d.grade === grade && d.division === div);
      timetable[className] = doc ? doc.periods : [];
    });
  });
  return { timetable, timeSlots: TIME_SLOTS };
};

const Timetable = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [timetableDocs, setTimetableDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStaffCode, setMyStaffCode] = useState(null);
  const [myInitials, setMyInitials] = useState('');

  useEffect(() => {
    api.get('/api/auth/me/staff-profile')
      .then((data) => {
        const profile = data.staffProfile;
        if (!profile) return;
        setMyStaffCode(profile.staffCode);
        setMyInitials(getInitials(profile.displayName));
      })
      .catch(() => {});
  }, []);

  const operationalDayStatus = useMemo(() => getOperationalDayStatus(currentDate), [currentDate]);
  const academicYearLabel = useMemo(() => getAcademicYearLabel(currentDate), [currentDate]);

  const apiDay = useMemo(() => jsDayToApiDay(currentDate.getDay()), [currentDate]);

  const fetchTimetable = useCallback(async (day) => {
    if (!day) { setTimetableDocs([]); setLoading(false); return; }
    setLoading(true);
    try {
      const docs = await api.get('/api/timetable', { day, academicYear: '2025-26' });
      setTimetableDocs(Array.isArray(docs) ? docs : []);
    } catch (err) {
      setTimetableDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable(apiDay);
  }, [apiDay, fetchTimetable]);

  const { timetable, timeSlots } = useMemo(() => buildTimetableFromDocs(timetableDocs), [timetableDocs]);
  const classNames = Object.keys(timetable);
  const [selectedClass, setSelectedClass] = useState(classNames[0] || '');

  useEffect(() => {
    if (classNames.length > 0 && !classNames.includes(selectedClass)) {
      setSelectedClass(classNames[0]);
    }
  }, [classNames, selectedClass]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.8rem', tableLayout: 'fixed' };
  const thStyle = { background: '#f8fafc', padding: '8px 4px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: '600', fontSize: '0.72rem' };
  const tdStyle = { padding: '6px 4px', border: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', fontSize: '0.72rem', height: '76px', verticalAlign: 'top' };
  const breakStyle = { background: '#fef3c7' };
  const assemblyStyle = { background: '#dbeafe' };
  const periodStyle = { background: '#f0f9ff' };
  const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '14px', background: '#f8fafc', borderRadius: '12px', gap: '10px', flexWrap: 'wrap' };
  const buttonStyle = { padding: '10px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' };
  const classRowStyle = { background: '#f1f5f9', fontWeight: '600' };
  const mobileCardStyle = { border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', background: '#fff', marginBottom: '10px' };

  const getCellStyle = (periodType) => {
    if (!periodType) return periodStyle;
    if (periodType.includes('Break')) return breakStyle;
    if (periodType === 'Prayer & Assembly') return assemblyStyle;
    return periodStyle;
  };

  const makePeriodLink = (className, periodIndex) => {
    const parts = className.split(' ');
    const grade = parts[1];
    const div = (parts[2] || '').toLowerCase();
    return `/timetable/period/${grade}/${div}/${periodIndex}/${formatDateKey(currentDate)}`;
  };

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1600px', margin: '0 auto', background: 'linear-gradient(to bottom, #f0f9ff 0%, #f9fafb 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ fontSize: '1.8rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>School Timetable</h2>
        <p style={{ color: '#475569', marginBottom: '20px', fontSize: '1rem', fontWeight: '500' }}>
          Consolidated daily timetable for Grades 1-4. Academic Year {academicYearLabel} (April to March).
        </p>
        <p style={{ marginTop: '-8px', marginBottom: '18px', color: '#475569', fontSize: '0.92rem' }}>
          Subjects covered: {SUBJECTS_G1_G4.join(', ')}.
        </p>

        <div style={{ ...navStyle, marginTop: 0, marginBottom: '18px', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 100%)', border: '2px solid #3b82f6', position: 'relative' }}>
          <button style={{ ...buttonStyle, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', fontWeight: '700', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)' }} onClick={() => navigateDate(-1)}>
            Previous Day
          </button>
          <button
            type="button"
            onClick={() => { setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)); setShowCalendar((v) => !v); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
          >
            <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: '#1e40af', fontWeight: '700' }}>📅 {formatDateLabel(currentDate)}</h3>
          </button>
          <button style={{ ...buttonStyle, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', fontWeight: '700', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)' }} onClick={() => navigateDate(1)}>
            Next Day
          </button>

          {showCalendar && (
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', zIndex: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', boxShadow: '0 12px 30px rgba(15,23,42,0.18)', width: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>←</button>
                <strong style={{ fontSize: '0.85rem' }}>{calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</strong>
                <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>→</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '0.72rem' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{d}</div>)}
                {generateCalendarDays(calendarMonth).map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!d}
                    onClick={() => { setCurrentDate(d); setShowCalendar(false); }}
                    style={{
                      border: 'none', borderRadius: '6px', padding: '6px 0', cursor: d ? 'pointer' : 'default',
                      background: d && isSameDate(d, currentDate) ? '#1e3a8a' : 'transparent',
                      color: d && isSameDate(d, currentDate) ? '#fff' : d ? '#334155' : 'transparent',
                      fontWeight: d && isSameDate(d, currentDate) ? 700 : 400,
                    }}
                  >
                    {d ? d.getDate() : '·'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {myStaffCode && (
          <p style={{ marginTop: '-8px', marginBottom: '18px', fontSize: '0.82rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#16a34a' }} /> Green-highlighted periods are the ones you teach.
          </p>
        )}

        <div style={{ marginBottom: '18px', padding: isMobile ? '12px' : '14px 16px', borderRadius: '12px', border: `2px solid ${operationalDayStatus.isWorkingDay ? '#16a34a' : '#f59e0b'}`, background: operationalDayStatus.isWorkingDay ? '#f0fdf4' : '#fffbeb' }}>
          <strong style={{ color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>Day Status: {operationalDayStatus.label}</strong>
          <p style={{ margin: '6px 0 0', color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>{operationalDayStatus.detail}</p>
        </div>

        {!operationalDayStatus.isWorkingDay ? (
          <section style={{ border: '2px dashed #f59e0b', background: '#fffbeb', borderRadius: '14px', padding: isMobile ? '16px' : '20px' }}>
            <h3 style={{ margin: 0, color: '#92400e' }}>No Timetable Periods Today</h3>
            <p style={{ margin: '8px 0 0', color: '#92400e' }}>Classes are not scheduled for this date based on your Saturday/Sunday working policy.</p>
          </section>
        ) : loading ? (
          <p style={{ color: '#64748b' }}>Loading timetable...</p>
        ) : isMobile ? (
          <section>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="class-picker" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1e40af', fontSize: '1rem' }}>
                Select Class Division
              </label>
              <select
                id="class-picker"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #3b82f6', fontSize: '1rem', background: '#fff', color: '#1f2937', fontWeight: '600' }}
              >
                {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {(timetable[selectedClass] || []).map((period, idx) => {
                const mine = !!myStaffCode && period.staffCode === myStaffCode;
                return (
                  <Link
                    key={idx}
                    to={makePeriodLink(selectedClass, period.periodIndex !== undefined ? period.periodIndex : idx)}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <article style={{ ...mobileCardStyle, ...getCellStyle(period.type), position: 'relative', boxShadow: mine ? '0 2px 10px rgba(22,163,74,0.25)' : '0 2px 8px rgba(0,0,0,0.08)', border: `2px solid ${mine ? '#16a34a' : (period.type || '').includes('Break') ? '#fbbf24' : period.type === 'Prayer & Assembly' ? '#0ea5e9' : '#93c5fd'}` }}>
                      {mine && (
                        <span style={{ position: 'absolute', top: '-9px', right: '10px', background: '#16a34a', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.02em' }}>👤 You · {myInitials}</span>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>{period.subject}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#475569', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>{period.time}</span>
                      </div>
                      <p style={{ marginTop: '6px', color: '#334155', fontSize: '0.86rem', fontWeight: '500' }}>{period.type}</p>
                      <p style={{ marginTop: '4px', color: '#64748b', fontSize: '0.82rem' }}>{period.teacherName}</p>
                      <p style={{ marginTop: '2px', color: '#64748b', fontSize: '0.82rem' }}>Room {period.room}</p>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '16px', padding: '16px', border: '2px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '120px', position: 'sticky', left: 0, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: '#fff', zIndex: 10, fontWeight: '700' }}>Class</th>
                  {timeSlots.map((timeSlot) => (
                    <th key={timeSlot} style={{ ...thStyle, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', fontWeight: '700' }}>{timeSlot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(timetable).map(([className, periods]) => (
                  <tr key={className}>
                    <td style={{ ...tdStyle, ...classRowStyle, position: 'sticky', left: 0, background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)', zIndex: 5, border: '2px solid #3b82f6', fontWeight: '700', color: '#1e40af' }}>
                      {className}
                    </td>
                    {(periods.length > 0 ? periods : Array.from({ length: timeSlots.length }, (_, i) => ({ periodIndex: i, time: timeSlots[i], type: 'Period', subject: '—', teacherName: '—', room: '—' }))).map((period, idx) => {
                      const mine = !!myStaffCode && period.staffCode === myStaffCode;
                      return (
                        <td key={idx} style={{ ...tdStyle, ...getCellStyle(period.type), position: 'relative', ...(mine ? { background: '#ecfdf5', border: '2px solid #16a34a' } : {}) }}>
                          {mine && (
                            <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#16a34a', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '999px' }}>{myInitials}</span>
                          )}
                          <Link
                            to={makePeriodLink(className, period.periodIndex !== undefined ? period.periodIndex : idx)}
                            style={{ color: 'inherit', textDecoration: 'none', display: 'block', height: '100%' }}
                          >
                            <div style={{ fontWeight: '700', marginBottom: '2px', color: '#1f2937' }}>{period.subject}</div>
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>{period.teacherName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>{period.room}</div>
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default Timetable;
