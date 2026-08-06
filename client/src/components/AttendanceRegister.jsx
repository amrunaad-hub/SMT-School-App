import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api';
import { DIVISIONS, GRADES } from '../data/studentDirectory';
import { formatDateKey, buildWeekStrip } from '../utils/calendarHelpers';
import { formatDateDMY } from '../utils/formatDate';

const CELL_META = {
  present: { symbol: '✓', color: '#166534', bg: '#dcfce7', label: 'Present' },
  absent: { symbol: 'A', color: '#dc2626', bg: '#fee2e2', label: 'Absent' },
  leave: { symbol: 'L', color: '#c2410c', bg: '#ffedd5', label: 'Leave' },
  halfday: { symbol: '½', color: '#92400e', bg: '#fef3c7', label: 'Half Day' },
  holiday: { symbol: 'H', color: '#0f766e', bg: '#ccfbf1', label: 'Holiday' },
  unmarked: { symbol: '—', color: '#64748b', bg: '#f1f5f9', label: 'Not marked yet' },
  future: { symbol: '', color: '#cbd5e1', bg: '#ffffff', label: 'Upcoming' },
};

const cardBase = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' };

const csvEscape = (value) => {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const AttendanceRegister = () => {
  const role = window.localStorage.getItem('smt-school-role');
  const isTeacher = role === 'teacher';

  const [profileStatus, setProfileStatus] = useState(isTeacher ? 'loading' : 'ready');
  const [teacherDivisionOptions, setTeacherDivisionOptions] = useState([]);
  const [grade, setGrade] = useState(isTeacher ? null : GRADES[0]);
  const [division, setDivision] = useState(isTeacher ? null : DIVISIONS[0]);

  const [rangeMode, setRangeMode] = useState('week'); // 'week' | 'month' | 'custom'
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [registerData, setRegisterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rollNo'); // 'rollNo' | 'name'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'leave'
  const [percentThreshold, setPercentThreshold] = useState('');

  // Teacher: resolve their own grade + which divisions they may view, exactly
  // like Teachers.jsx does for the attendance-marking flow (a class teacher
  // may cover other divisions of their own grade; a subject teacher is locked
  // to their one division).
  useEffect(() => {
    if (!isTeacher) return;
    api.get('/api/auth/me/staff-profile')
      .then((data) => {
        const profile = data.staffProfile;
        const classTeacherEntry = profile && (profile.currentClassTeacherOf || [])[0];
        const cls = classTeacherEntry || (profile && (profile.classAssignments || [])[0]);
        if (!profile || !cls) { setProfileStatus('unlinked'); return; }
        setTeacherDivisionOptions(classTeacherEntry ? DIVISIONS : [cls.division]);
        setGrade(cls.grade);
        setDivision(cls.division);
        setProfileStatus('linked');
      })
      .catch(() => setProfileStatus('unlinked'));
  }, [isTeacher]);

  const { from, to } = useMemo(() => {
    if (rangeMode === 'week') {
      const strip = buildWeekStrip(anchorDate);
      return { from: formatDateKey(strip[0]), to: formatDateKey(strip[6]) };
    }
    if (rangeMode === 'month') {
      const year = anchorDate.getFullYear();
      const month = anchorDate.getMonth();
      return { from: formatDateKey(new Date(year, month, 1)), to: formatDateKey(new Date(year, month + 1, 0)) };
    }
    return { from: customFrom, to: customTo };
  }, [rangeMode, anchorDate, customFrom, customTo]);

  const rangeTooLarge = useMemo(() => {
    if (!from || !to) return false;
    const days = Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;
    return days > 120 || days < 1;
  }, [from, to]);

  const ready = grade && division && from && to && !rangeTooLarge && (!isTeacher || profileStatus === 'linked');

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    setError('');
    api.get('/api/attendance/register', { grade, division, from, to })
      .then((data) => setRegisterData(data))
      .catch((err) => { setError(err.message || 'Failed to load attendance register.'); setRegisterData(null); })
      .finally(() => setLoading(false));
  }, [ready, grade, division, from, to]);

  const navigateWeek = (delta) => setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() + delta * 7); return n; });
  const navigateMonth = (delta) => setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const goToToday = () => setAnchorDate(new Date());

  const isGridView = rangeMode !== 'month' && (registerData?.dates?.length || 0) <= 14;
  const visibleDates = useMemo(() => (registerData?.dates || []).filter((d) => d.isWorkingDay), [registerData]);

  const visibleStudents = useMemo(() => {
    let list = registerData?.students || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      list = list.filter((s) => Object.values(s.cells).some((c) => c.status === typeFilter));
    }
    const threshold = percentThreshold === '' ? null : Number(percentThreshold);
    if (threshold != null && !Number.isNaN(threshold)) {
      list = list.filter((s) => s.aggregate.attendancePercent != null && s.aggregate.attendancePercent < threshold);
    }
    list = [...list].sort(sortBy === 'name'
      ? (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      : (a, b) => a.rollNo - b.rollNo);
    return list;
  }, [registerData, search, typeFilter, percentThreshold, sortBy]);

  const buildTableRows = () => {
    if (isGridView) {
      const header = ['Roll No', 'Student Name', ...visibleDates.map((d) => formatDateDMY(d.date)), 'Attendance %'];
      const rows = visibleStudents.map((s) => [
        s.rollNo,
        `${s.firstName} ${s.lastName}`,
        ...visibleDates.map((d) => CELL_META[s.cells[d.date]?.status || 'unmarked'].symbol),
        s.aggregate.attendancePercent ?? '',
      ]);
      return [header, ...rows];
    }
    const header = ['Roll No', 'Student Name', 'Working Days', 'Present', 'Half Days', 'Absent', 'Leave', 'Attendance %'];
    const rows = visibleStudents.map((s) => [
      s.rollNo, `${s.firstName} ${s.lastName}`,
      s.aggregate.workingDaysConsidered, s.aggregate.presentDays, s.aggregate.halfDays, s.aggregate.absentDays, s.aggregate.leaveDays,
      s.aggregate.attendancePercent ?? '',
    ]);
    return [header, ...rows];
  };

  const exportFilenameBase = () => `${grade}-${division}-attendance-register-${from}-to-${to}`;

  const downloadCsv = () => {
    const rows = buildTableRows();
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
    downloadBlob(`${exportFilenameBase()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  };

  const downloadPdf = () => {
    const rows = buildTableRows();
    const doc = new jsPDF({ orientation: isGridView ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('SMT SCHOOL — Attendance Register', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Grade ${grade} ${division.charAt(0).toUpperCase() + division.slice(1)} · ${formatDateDMY(from)} to ${formatDateDMY(to)}`, 14, 21);
    autoTable(doc, { head: [rows[0]], body: rows.slice(1), startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } });
    doc.save(`${exportFilenameBase()}.pdf`);
  };

  const downloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance Register');
      const rows = buildTableRows();
      sheet.addRow(rows[0]);
      sheet.getRow(1).font = { bold: true };
      rows.slice(1).forEach((r) => sheet.addRow(r));
      sheet.columns.forEach((col) => { col.width = 16; });
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(`${exportFilenameBase()}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (err) {
      setError('Could not generate the Excel file: ' + err.message);
    }
  };

  const inputStyle = { padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontFamily: 'inherit' };
  const buttonStyle = (active) => ({ padding: '8px 14px', borderRadius: '999px', border: `1px solid ${active ? '#1e3a8a' : '#cbd5e1'}`, background: active ? '#1e3a8a' : '#fff', color: active ? '#fff' : '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' });

  if (isTeacher && profileStatus === 'loading') {
    return <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}><div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>Loading…</div></main>;
  }
  if (isTeacher && profileStatus === 'unlinked') {
    return (
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ ...cardBase, textAlign: 'center', color: '#475569', padding: '32px 20px' }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>No teacher profile is linked to this login.</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.88rem' }}>The Attendance Register shows an individual teacher's own class — this account isn't linked to a staff record.</p>
        </div>
      </main>
    );
  }

  const today = registerData?.today;

  return (
    <main style={{ padding: '20px', maxWidth: '1300px', margin: '0 auto' }}>
      <section style={{ borderRadius: '16px', padding: '20px 24px', border: '1px solid #bfdbfe', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', boxShadow: '0 10px 22px rgba(30,64,175,0.1)', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#1e3a8a', fontWeight: 800 }}>📖 Attendance Register</h2>
        <p style={{ margin: '6px 0 0', color: '#334155', fontSize: '0.9rem' }}>
          {isTeacher ? `Grade ${grade} ${division ? division.charAt(0).toUpperCase() + division.slice(1) : ''}` : 'Select any grade and division to view its register.'}
        </p>
      </section>

      {/* Summary dashboard — always "today", independent of the range being browsed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          ['Total Students', today?.totalStudents ?? '—', '#1e3a8a', '#eff6ff'],
          ['Present Today', today?.presentToday ?? '—', '#166534', '#dcfce7'],
          ['Absent Today', today?.absentToday ?? '—', '#dc2626', '#fee2e2'],
          ['On Leave Today', today?.onLeaveToday ?? '—', '#c2410c', '#ffedd5'],
          ['Overall Attendance', today?.overallAttendancePercent != null ? `${today.overallAttendancePercent}%` : '—', '#0f766e', '#ccfbf1'],
        ].map(([label, value, color, bg]) => (
          <div key={label} style={{ ...cardBase, textAlign: 'center', background: bg, border: `1px solid ${color}33` }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          {!isTeacher && (
            <>
              <select value={grade || ''} onChange={(e) => setGrade(Number(e.target.value))} style={inputStyle}>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <select value={division || ''} onChange={(e) => setDivision(e.target.value)} style={inputStyle}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </>
          )}
          {isTeacher && teacherDivisionOptions.length > 1 && (
            <select value={division || ''} onChange={(e) => setDivision(e.target.value)} style={inputStyle}>
              {teacherDivisionOptions.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => setRangeMode('week')} style={buttonStyle(rangeMode === 'week')}>Week</button>
            <button type="button" onClick={() => setRangeMode('month')} style={buttonStyle(rangeMode === 'month')}>Month</button>
            <button type="button" onClick={() => setRangeMode('custom')} style={buttonStyle(rangeMode === 'custom')}>Custom Range</button>
          </div>

          {rangeMode === 'week' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" onClick={() => navigateWeek(-1)} style={inputStyle}>⬅️ Prev</button>
              <button type="button" onClick={goToToday} style={inputStyle}>Current Week</button>
              <button type="button" onClick={() => navigateWeek(1)} style={inputStyle}>Next ➡️</button>
            </div>
          )}
          {rangeMode === 'month' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" onClick={() => navigateMonth(-1)} style={inputStyle}>⬅️</button>
              <strong style={{ fontSize: '0.85rem', color: '#334155' }}>{anchorDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
              <button type="button" onClick={() => navigateMonth(1)} style={inputStyle}>➡️</button>
            </div>
          )}
          {rangeMode === 'custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
              <span>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search student name" style={{ ...inputStyle, minWidth: '180px' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
            <option value="rollNo">Sort: Roll No</option>
            <option value="name">Sort: Name (A–Z)</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
            <option value="all">Attendance Type: All</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#334155' }}>
            Below
            <input type="number" min="0" max="100" value={percentThreshold} onChange={(e) => setPercentThreshold(e.target.value)} placeholder="%" style={{ ...inputStyle, width: '64px' }} />
            % attendance
          </label>
        </div>
      </div>

      {rangeTooLarge && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>Please pick a range of 120 days or fewer.</p>}
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}

      {loading ? (
        <div style={{ ...cardBase, textAlign: 'center', color: '#64748b' }}>Loading…</div>
      ) : !registerData ? null : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button type="button" onClick={downloadExcel} style={{ ...buttonStyle(false), background: '#ecfdf5', border: '1px solid #059669', color: '#065f46' }}>⬇ Excel (.xlsx)</button>
            <button type="button" onClick={downloadPdf} style={{ ...buttonStyle(false), background: '#eff6ff', border: '1px solid #1d4ed8', color: '#1e3a8a' }}>⬇ PDF</button>
            <button type="button" onClick={downloadCsv} style={{ ...buttonStyle(false), background: '#f8fafc', border: '1px solid #64748b', color: '#334155' }}>⬇ CSV</button>
          </div>

          <div style={{ ...cardBase, overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Roll</th>
                  <th style={{ padding: '10px' }}>Student Name</th>
                  {isGridView
                    ? visibleDates.map((d) => (
                      <th key={d.date} style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {formatDateDMY(d.date, { withWeekday: true }).split(',')[0]}<br />{formatDateDMY(d.date)}
                      </th>
                    ))
                    : ['Working Days', 'Present', 'Half Days', 'Absent', 'Leave'].map((h) => <th key={h} style={{ padding: '10px', textAlign: 'center' }}>{h}</th>)}
                  <th style={{ padding: '10px', textAlign: 'center' }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.length === 0 ? (
                  <tr><td colSpan={isGridView ? visibleDates.length + 3 : 8} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No students match the current filters.</td></tr>
                ) : visibleStudents.map((s) => (
                  <tr key={s.studentId} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 10px', color: '#64748b' }}>{s.rollNo}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{s.firstName} {s.lastName}</td>
                    {isGridView ? visibleDates.map((d) => {
                      const cell = s.cells[d.date] || { status: 'unmarked' };
                      const meta = CELL_META[cell.status];
                      return (
                        <td key={d.date} title={cell.reason ? `${meta.label}: ${cell.reason}` : meta.label} style={{ padding: '6px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', minWidth: '26px', padding: '3px 0', borderRadius: '6px', background: meta.bg, color: meta.color, fontWeight: 800 }}>{meta.symbol}</span>
                        </td>
                      );
                    }) : (
                      <>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{s.aggregate.workingDaysConsidered}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{s.aggregate.presentDays}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{s.aggregate.halfDays}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{s.aggregate.absentDays}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{s.aggregate.leaveDays}</td>
                      </>
                    )}
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: s.aggregate.attendancePercent == null ? '#94a3b8' : s.aggregate.attendancePercent < 75 ? '#dc2626' : '#166534' }}>
                      {s.aggregate.attendancePercent != null ? `${s.aggregate.attendancePercent}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px', fontSize: '0.78rem', color: '#475569' }}>
            {Object.entries(CELL_META).filter(([k]) => k !== 'future').map(([key, meta]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', minWidth: '20px', padding: '1px 4px', borderRadius: '4px', background: meta.bg, color: meta.color, fontWeight: 800, textAlign: 'center' }}>{meta.symbol || '·'}</span>
                {meta.label}
              </span>
            ))}
          </div>
        </>
      )}
    </main>
  );
};

export default AttendanceRegister;
