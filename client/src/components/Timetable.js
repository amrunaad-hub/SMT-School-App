import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildConsolidatedTimetable, SUBJECTS_G1_G4 } from '../data/facultyScheduler';

const formatDateLabel = (date) => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getAcademicYearLabel = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const getSaturdayOccurrence = (date) => {
  return Math.floor((date.getDate() - 1) / 7) + 1;
};

const getOperationalDayStatus = (date) => {
  const day = date.getDay();
  const monthName = date.toLocaleDateString('en-IN', { month: 'long' });

  if (day === 0) {
    return {
      isWorkingDay: false,
      label: 'Sunday Off',
      detail: `All Sundays are marked as non-working days. ${formatDateLabel(date)} is a holiday.`,
    };
  }

  if (day === 6) {
    const occurrence = getSaturdayOccurrence(date);
    if (occurrence === 2 || occurrence === 4) {
      return {
        isWorkingDay: false,
        label: `${occurrence}${occurrence === 2 ? 'nd' : 'th'} Saturday Off`,
        detail: `${occurrence}${occurrence === 2 ? 'nd' : 'th'} Saturday in ${monthName} is a holiday as per timetable policy.`,
      };
    }

    return {
      isWorkingDay: true,
      label: `${occurrence}${occurrence === 1 ? 'st' : occurrence === 3 ? 'rd' : 'th'} Saturday Working`,
      detail: `${occurrence}${occurrence === 1 ? 'st' : occurrence === 3 ? 'rd' : 'th'} Saturday is a full working timetable day.`,
    };
  }

  return {
    isWorkingDay: true,
    label: 'Regular Working Day',
    detail: 'Regular weekday timetable is active.',
  };
};

const Timetable = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

  const formatDate = (date) => {
    return formatDateLabel(date);
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const { timetable, timeSlots } = useMemo(() => buildConsolidatedTimetable(), []);
  const classNames = Object.keys(timetable);
  const [selectedClass, setSelectedClass] = useState(classNames[0]);
  const operationalDayStatus = useMemo(() => getOperationalDayStatus(currentDate), [currentDate]);
  const academicYearLabel = useMemo(() => getAcademicYearLabel(currentDate), [currentDate]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
    fontSize: '0.8rem',
    tableLayout: 'fixed'
  };

  const thStyle = {
    background: '#f8fafc',
    padding: '8px 4px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.72rem'
  };

  const tdStyle = {
    padding: '6px 4px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '0.72rem',
    height: '76px',
    verticalAlign: 'top'
  };

  const breakStyle = {
    background: '#fef3c7'
  };

  const assemblyStyle = {
    background: '#dbeafe'
  };

  const periodStyle = {
    background: '#f0f9ff'
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '14px',
    background: '#f8fafc',
    borderRadius: '12px',
    gap: '10px',
    flexWrap: 'wrap'
  };

  const buttonStyle = {
    padding: '10px 14px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  };

  const classRowStyle = {
    background: '#f1f5f9',
    fontWeight: '600'
  };

  const mobileCardStyle = {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    background: '#fff',
    marginBottom: '10px'
  };

  const getCellStyle = (periodType) => {
    if (periodType.includes('Break')) return breakStyle;
    if (periodType === 'Prayer & Assembly') return assemblyStyle;
    return periodStyle;
  };

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1600px', margin: '0 auto', background: 'linear-gradient(to bottom, #f0f9ff 0%, #f9fafb 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ fontSize: '1.8rem', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>⏰ School Timetable</h2>
        <p style={{ color: '#475569', marginBottom: '20px', fontSize: '1rem', fontWeight: '500' }}>
          📅 Consolidated daily timetable for Grades 1-4. Academic Year {academicYearLabel} (April to March).
        </p>
        <p style={{ marginTop: '-8px', marginBottom: '18px', color: '#475569', fontSize: '0.92rem' }}>
          Subjects covered: {SUBJECTS_G1_G4.join(', ')}.
        </p>

        <div style={{ marginBottom: '18px', padding: isMobile ? '12px' : '14px 16px', borderRadius: '12px', border: `2px solid ${operationalDayStatus.isWorkingDay ? '#16a34a' : '#f59e0b'}`, background: operationalDayStatus.isWorkingDay ? '#f0fdf4' : '#fffbeb' }}>
          <strong style={{ color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>Day Status: {operationalDayStatus.label}</strong>
          <p style={{ margin: '6px 0 0', color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>{operationalDayStatus.detail}</p>
        </div>

        {!operationalDayStatus.isWorkingDay ? (
          <section style={{ border: '2px dashed #f59e0b', background: '#fffbeb', borderRadius: '14px', padding: isMobile ? '16px' : '20px' }}>
            <h3 style={{ margin: 0, color: '#92400e' }}>No Timetable Periods Today</h3>
            <p style={{ margin: '8px 0 0', color: '#92400e' }}>Classes are not scheduled for this date based on your Saturday/Sunday working policy.</p>
          </section>
        ) : isMobile ? (
          <section>
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="class-picker" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1e40af', fontSize: '1rem' }}>
                📚 Select Class Division
              </label>
              <select
                id="class-picker"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #3b82f6', fontSize: '1rem', background: '#fff', color: '#1f2937', fontWeight: '600' }}
              >
                {classNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {(timetable[selectedClass] || []).map((period) => (
                <Link
                  key={period.id}
                  to={`/timetable/period/${period.id}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <article style={{ ...mobileCardStyle, ...getCellStyle(period.type), boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: `2px solid ${period.type.includes('Break') ? '#fbbf24' : period.type === 'Prayer & Assembly' ? '#0ea5e9' : '#93c5fd'}`, transition: 'all 0.3s', ':hover': { transform: 'translateY(-2px)' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>📖 {period.subject}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#475569', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⏱️ {period.time}</span>
                    </div>
                    <p style={{ marginTop: '6px', color: '#334155', fontSize: '0.86rem', fontWeight: '500' }}>🏫 {period.type}</p>
                    <p style={{ marginTop: '4px', color: '#64748b', fontSize: '0.82rem' }}>👨‍🏫 {period.teacher}</p>
                    <p style={{ marginTop: '2px', color: '#64748b', fontSize: '0.82rem' }}>🚪 Room {period.room}</p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '16px', padding: '16px', border: '2px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '120px', position: 'sticky', left: 0, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', color: '#fff', zIndex: 10, fontWeight: '700' }}>📚 Class</th>
                  {timeSlots.map(timeSlot => (
                    <th key={timeSlot} style={{ ...thStyle, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', fontWeight: '700' }}>⏰ {timeSlot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(timetable).map(([className, periods]) => (
                  <tr key={className}>
                    <td style={{ ...tdStyle, ...classRowStyle, position: 'sticky', left: 0, background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)', zIndex: 5, border: '2px solid #3b82f6', fontWeight: '700', color: '#1e40af' }}>
                      {className}
                    </td>
                    {periods.map((period) => (
                      <td key={period.id} style={{ ...tdStyle, ...getCellStyle(period.type), transition: 'all 0.2s' }}>
                        <Link
                          to={`/timetable/period/${period.id}`}
                          style={{ color: 'inherit', textDecoration: 'none', display: 'block', height: '100%' }}
                        >
                          <div style={{ fontWeight: '700', marginBottom: '2px', color: '#1f2937' }}>{period.subject}</div>
                          <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>👨‍🏫 {period.teacher}</div>
                          <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>🚪 {period.room}</div>
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ ...navStyle, background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 100%)', border: '2px solid #3b82f6' }}>
          <button style={{ ...buttonStyle, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', fontWeight: '700', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)' }} onClick={() => navigateDate(-1)}>
            ⬅️ Previous Day
          </button>
          <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: '#1e40af', fontWeight: '700' }}>📅 {formatDate(currentDate)}</h3>
          <button style={{ ...buttonStyle, background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', fontWeight: '700', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)' }} onClick={() => navigateDate(1)}>
            Next Day ➡️
          </button>
        </div>
      </section>
    </main>
  );
};

export default Timetable;
