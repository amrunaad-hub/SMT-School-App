import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DIVISIONS, GRADES, getStudentById } from '../data/studentDirectory';
import { DEFAULT_ATTENDANCE_DATE, advanceLeaveRequests, getAttendanceStatsForDate, lateArrivals, weeklyAttendanceTrend } from '../data/attendanceAnalytics';

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
  if (day === 0) {
    return { isWorkingDay: false, label: 'Sunday Off' };
  }
  if (day === 6) {
    const occurrence = getSaturdayOccurrence(date);
    if (occurrence === 2 || occurrence === 4) {
      return { isWorkingDay: false, label: `${occurrence}${occurrence === 2 ? 'nd' : 'th'} Saturday Off` };
    }
    return { isWorkingDay: true, label: `${occurrence}${occurrence === 1 ? 'st' : occurrence === 3 ? 'rd' : 'th'} Saturday Working` };
  }
  return { isWorkingDay: true, label: 'Regular Working Day' };
};

const formatDivision = (division) => `${division.charAt(0).toUpperCase()}${division.slice(1)}`;

const Attendance = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const selectedDate = searchParams.get('date') || DEFAULT_ATTENDANCE_DATE;
  const selectedGrade = searchParams.get('grade') || 'all';
  const selectedDivision = searchParams.get('division') || 'all';
  const selectedView = searchParams.get('view') || 'all';

  const selectedDateObject = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
  const operationalDayStatus = useMemo(() => getOperationalDayStatus(selectedDateObject), [selectedDateObject]);
  const academicYearLabel = useMemo(() => getAcademicYearLabel(selectedDateObject), [selectedDateObject]);
  const attendanceSnapshot = useMemo(() => getAttendanceStatsForDate(selectedDate), [selectedDate]);

  const updateFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams);
  };

  const selectedGradeStats = attendanceSnapshot.gradeStats.find((grade) => String(grade.grade) === selectedGrade) || null;

  const filteredAbsentees = useMemo(() => {
    if (!operationalDayStatus.isWorkingDay) {
      return [];
    }
    return attendanceSnapshot.absentees.filter((entry) => {
      const gradeMatch = selectedGrade === 'all' ? true : String(entry.grade) === selectedGrade;
      const divisionMatch = selectedDivision === 'all' ? true : entry.division === selectedDivision;
      const viewMatch = selectedView === 'all'
        ? true
        : selectedView === 'no-intimation'
          ? entry.intimation === 'No prior intimation'
          : entry.intimation === 'Advance leave';
      return gradeMatch && divisionMatch && viewMatch;
    });
  }, [attendanceSnapshot.absentees, operationalDayStatus, selectedDivision, selectedGrade, selectedView]);

  const filteredAdvanceLeave = useMemo(() => {
    return advanceLeaveRequests
      .map((request) => {
        const student = getStudentById(request.studentId);
        if (!student || request.date !== selectedDate) {
          return null;
        }
        return {
          ...request,
          studentName: student.name,
          grade: student.grade,
          division: student.division,
        };
      })
      .filter(Boolean)
      .filter((request) => {
        const gradeMatch = selectedGrade === 'all' ? true : String(request.grade) === selectedGrade;
        const divisionMatch = selectedDivision === 'all' ? true : request.division === selectedDivision;
        return gradeMatch && divisionMatch;
      });
  }, [selectedDate, selectedDivision, selectedGrade]);

  const filteredLateArrivals = useMemo(() => {
    return (lateArrivals[selectedDate] || [])
      .map((entry) => {
        const student = getStudentById(entry.studentId);
        if (!student) {
          return null;
        }
        return {
          ...entry,
          studentName: student.name,
          grade: student.grade,
          division: student.division,
        };
      })
      .filter(Boolean)
      .filter((entry) => {
        const gradeMatch = selectedGrade === 'all' ? true : String(entry.grade) === selectedGrade;
        const divisionMatch = selectedDivision === 'all' ? true : entry.division === selectedDivision;
        return gradeMatch && divisionMatch;
      });
  }, [selectedDate, selectedDivision, selectedGrade]);

  const sectionStyle = {
    marginTop: '24px',
    padding: isMobile ? '16px' : '24px',
    borderRadius: '20px',
    background: '#ffffff',
    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
  };

  const cardStyle = {
    padding: '18px 20px',
    borderRadius: '16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  const pillButton = (active) => ({
    padding: '10px 14px',
    borderRadius: '999px',
    border: `1px solid ${active ? '#0284c7' : '#cbd5e1'}`,
    background: active ? '#e0f2fe' : '#fff',
    color: active ? '#0c4a6e' : '#0f172a',
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1280px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Attendance Dashboards</h2>
        <p style={{ color: '#475569', marginTop: '8px', maxWidth: '920px' }}>
          Attendance analytics now drill down from school totals to grade, division, and the actual absent student roster with reasons, prior intimation status, and profile links. Academic Year {academicYearLabel}.
        </p>
        <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '12px', border: `2px solid ${operationalDayStatus.isWorkingDay ? '#22c55e' : '#f59e0b'}`, background: operationalDayStatus.isWorkingDay ? '#f0fdf4' : '#fffbeb' }}>
          <strong style={{ color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>Attendance Policy Status: {operationalDayStatus.label}</strong>
          <p style={{ margin: '6px 0 0', color: operationalDayStatus.isWorkingDay ? '#166534' : '#92400e' }}>Working Saturdays: 1st, 3rd, 5th. Holidays: 2nd Saturday, 4th Saturday, and all Sundays.</p>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Daily Attendance Drill-down</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Pick a date, then narrow by grade, division, and absentee type.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="date" value={selectedDate} onChange={(event) => updateFilters({ date: event.target.value })} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
            <select value={selectedGrade} onChange={(event) => updateFilters({ grade: event.target.value, division: 'all' })} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <option value="all">All grades</option>
              {GRADES.map((grade) => <option key={grade} value={String(grade)}>Grade {grade}</option>)}
            </select>
            <select value={selectedDivision} onChange={(event) => updateFilters({ division: event.target.value })} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <option value="all">All divisions</option>
              {DIVISIONS.map((division) => <option key={division} value={division}>Division {formatDivision(division)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '18px' }}>
          <button type="button" onClick={() => updateFilters({ view: 'all' })} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedView === 'all' ? '#0284c7' : '#e2e8f0', background: selectedView === 'all' ? '#f0f9ff' : '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px' }}>Overall Attendance</h4>
            <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>{attendanceSnapshot.totals.attendancePercent}%</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>{attendanceSnapshot.totals.present} present · {attendanceSnapshot.totals.absent} absent</p>
          </button>
          <button type="button" onClick={() => updateFilters({ view: 'advance-leave' })} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedView === 'advance-leave' ? '#0284c7' : '#e2e8f0', background: selectedView === 'advance-leave' ? '#f0f9ff' : '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px' }}>Advance Leave</h4>
            <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>{attendanceSnapshot.totals.advanceLeaveCount}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Absences with prior intimation.</p>
          </button>
          <button type="button" onClick={() => updateFilters({ view: 'no-intimation' })} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedView === 'no-intimation' ? '#0284c7' : '#e2e8f0', background: selectedView === 'no-intimation' ? '#f0f9ff' : '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px' }}>No Prior Intimation</h4>
            <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>{attendanceSnapshot.totals.noIntimationCount}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Follow-up required by class team.</p>
          </button>
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 10px' }}>Late Arrivals</h4>
            <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>{attendanceSnapshot.totals.lateArrivalCount}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Students who entered after assembly.</p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Grade-wise Absenteeism</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Click a grade card to open division-level absentee counts.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={pillButton(selectedGrade === 'all')} onClick={() => updateFilters({ grade: 'all', division: 'all' })}>All grades</button>
            {attendanceSnapshot.gradeStats.filter((grade) => grade.absent > 0).map((grade) => (
              <button key={grade.grade} type="button" style={pillButton(selectedGrade === String(grade.grade))} onClick={() => updateFilters({ grade: String(grade.grade), division: 'all' })}>
                Grade {grade.grade}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '18px' }}>
          {attendanceSnapshot.gradeStats.map((grade) => (
            <button
              key={grade.grade}
              type="button"
              onClick={() => updateFilters({ grade: String(grade.grade), division: 'all' })}
              style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedGrade === String(grade.grade) ? '#0ea5e9' : '#e2e8f0', background: selectedGrade === String(grade.grade) ? '#f0f9ff' : '#f8fafc' }}
            >
              <h4 style={{ margin: 0 }}>Grade {grade.grade}</h4>
              <div style={{ marginTop: '12px', display: 'grid', gap: '6px', color: '#334155' }}>
                <span>Absent: <strong>{grade.absent}</strong></span>
                <span>Present: <strong>{grade.present}</strong></span>
                <span>Attendance: <strong>{grade.attendancePercent}%</strong></span>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: '#dbeafe', overflow: 'hidden', marginTop: '14px' }}>
                <div style={{ width: `${grade.attendancePercent}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)' }} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedGradeStats && (
        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0 }}>Division-wise Drill-down for Grade {selectedGradeStats.grade}</h3>
              <p style={{ margin: '8px 0 0', color: '#64748b' }}>Open the division count to list the actual absent students.</p>
            </div>
            <button type="button" style={pillButton(false)} onClick={() => updateFilters({ grade: 'all', division: 'all' })}>Clear grade filter</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '18px' }}>
            {selectedGradeStats.divisions.map((division) => (
              <button
                key={division.division}
                type="button"
                onClick={() => updateFilters({ division: division.division })}
                style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedDivision === division.division ? '#0284c7' : '#e2e8f0', background: selectedDivision === division.division ? '#f0f9ff' : '#f8fafc' }}
              >
                <h4 style={{ margin: 0 }}>{division.label}</h4>
                <div style={{ marginTop: '12px', display: 'grid', gap: '6px', color: '#334155' }}>
                  <span>Absent: <strong>{division.absent}</strong></span>
                  <span>Present: <strong>{division.present}</strong></span>
                  <span>Attendance: <strong>{division.attendancePercent}%</strong></span>
                </div>
                {division.absentStudents.length > 0 && <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{division.absentStudents.length} student profiles available in drill-down.</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Absent Student Roster</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
              {selectedGrade === 'all' ? 'All grades' : `Grade ${selectedGrade}`}
              {selectedDivision === 'all' ? '' : ` · Division ${formatDivision(selectedDivision)}`}
              {' · '}
              {selectedView === 'all' ? 'All absentees' : selectedView === 'no-intimation' ? 'No prior intimation only' : 'Advance leave only'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={pillButton(selectedView === 'all')} onClick={() => updateFilters({ view: 'all' })}>All</button>
            <button type="button" style={pillButton(selectedView === 'advance-leave')} onClick={() => updateFilters({ view: 'advance-leave' })}>Advance leave</button>
            <button type="button" style={pillButton(selectedView === 'no-intimation')} onClick={() => updateFilters({ view: 'no-intimation' })}>No prior intimation</button>
          </div>
        </div>

        {!operationalDayStatus.isWorkingDay ? (
          <p style={{ color: '#64748b', marginTop: '16px' }}>School is off for the selected date, so absentee drill-down is not applicable.</p>
        ) : isMobile ? (
          <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
            {filteredAbsentees.map((entry) => (
              <article key={entry.studentId} style={{ ...cardStyle, background: '#fff' }}>
                <Link to={`/sis/student/${entry.studentId}`} style={{ color: '#0f172a', fontWeight: 800, textDecoration: 'none' }}>{entry.studentName}</Link>
                <p style={{ margin: '6px 0 0', color: '#475569' }}>Grade {entry.grade} · Division {formatDivision(entry.division)} · Roll {entry.rollNo}</p>
                <p style={{ margin: '8px 0 0', color: '#334155' }}>Reason: {entry.reason}</p>
                <p style={{ margin: '6px 0 0', color: entry.intimation === 'No prior intimation' ? '#b45309' : '#166534', fontWeight: 700 }}>{entry.intimation}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>{entry.followUp}</p>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Grade</th>
                  <th style={{ padding: '12px 16px' }}>Division</th>
                  <th style={{ padding: '12px 16px' }}>Roll No</th>
                  <th style={{ padding: '12px 16px' }}>Reason</th>
                  <th style={{ padding: '12px 16px' }}>Intimation</th>
                  <th style={{ padding: '12px 16px' }}>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsentees.map((entry) => (
                  <tr key={entry.studentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 16px' }}><Link to={`/sis/student/${entry.studentId}`} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>{entry.studentName}</Link></td>
                    <td style={{ padding: '14px 16px' }}>Grade {entry.grade}</td>
                    <td style={{ padding: '14px 16px' }}>Division {formatDivision(entry.division)}</td>
                    <td style={{ padding: '14px 16px' }}>{entry.rollNo}</td>
                    <td style={{ padding: '14px 16px' }}>{entry.reason}</td>
                    <td style={{ padding: '14px 16px', color: entry.intimation === 'No prior intimation' ? '#b45309' : '#166534', fontWeight: 700 }}>{entry.intimation}</td>
                    <td style={{ padding: '14px 16px' }}>{entry.followUp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr', gap: '18px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Weekly Absentee Trend</h3>
            <p style={{ margin: '8px 0 14px', color: '#64748b' }}>Daily attendance percentages and absence counts with visual representation and labeled values.</p>
            
            <div style={{ ...cardStyle, marginBottom: '16px', background: '#fff' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Attendance Rate</span>
                <span>Absences</span>
              </div>
              <svg style={{ width: '100%', height: '240px', minHeight: '240px' }} viewBox={`0 0 ${weeklyAttendanceTrend.length * 80} 240`} preserveAspectRatio="none">
                {weeklyAttendanceTrend.map((point, idx) => {
                  const x = idx * 80 + 20;
                  const maxHeight = 180;
                  const barHeight = (point.attendancePercent / 100) * maxHeight;
                  const yStart = 200 - barHeight;
                  const isSelected = selectedDate === point.date;
                  
                  return (
                    <g key={point.date}>
                      <rect
                        x={x}
                        y={yStart}
                        width="50"
                        height={barHeight}
                        fill={isSelected ? '#0284c7' : '#38bdf8'}
                        rx="4"
                        onClick={() => updateFilters({ date: point.date })}
                        style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.8 }}
                      />
                      <text x={x + 25} y={yStart - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a" onClick={() => updateFilters({ date: point.date })} style={{ cursor: 'pointer' }}>
                        {point.attendancePercent}%
                      </text>
                      <text x={x + 25} y="220" textAnchor="middle" fontSize="10" fill="#64748b">
                        {point.label}
                      </text>
                      {point.absent > 0 && (
                        <circle
                          cx={x + 25}
                          cy={yStart - 20}
                          r="14"
                          fill="#ff6b6b"
                          onClick={() => updateFilters({ date: point.date })}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                      {point.absent > 0 && (
                        <text x={x + 25} y={yStart - 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" onClick={() => updateFilters({ date: point.date })} style={{ cursor: 'pointer', pointerEvents: 'none' }}>
                          {point.absent}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              {weeklyAttendanceTrend.map((point) => (
                <button key={point.date} type="button" onClick={() => updateFilters({ date: point.date })} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: selectedDate === point.date ? '#0284c7' : '#e2e8f0', background: selectedDate === point.date ? '#f0f9ff' : '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <strong>{point.label}</strong>
                    <span>{point.attendancePercent}% attendance</span>
                  </div>
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', color: '#334155', fontSize: '0.88rem' }}>
                    <span>Absent: {point.absent}</span>
                    <span>No intimation: {point.noIntimationCount}</span>
                    <span>Date: {point.date}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ margin: 0 }}>Related Actions</h3>
            <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 10px' }}>Advance Leave Requests</h4>
                {filteredAdvanceLeave.length === 0 ? <p style={{ margin: 0, color: '#64748b' }}>No advance leave requests for the current filter.</p> : filteredAdvanceLeave.map((request, index) => (
                  <div key={request.id} style={{ padding: '10px 0', borderBottom: index === filteredAdvanceLeave.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{request.studentName}</p>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>Grade {request.grade} · Division {formatDivision(request.division)}</p>
                    <p style={{ margin: '4px 0 0', color: '#334155' }}>{request.type}</p>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>{request.notice}</p>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 10px' }}>Late Arrival Watch</h4>
                {filteredLateArrivals.length === 0 ? <p style={{ margin: 0, color: '#64748b' }}>No late arrival alerts for the selected date.</p> : filteredLateArrivals.map((entry, index) => (
                  <div key={entry.studentId} style={{ padding: '10px 0', borderBottom: index === filteredLateArrivals.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{entry.studentName}</p>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>Grade {entry.grade} · Division {formatDivision(entry.division)}</p>
                    <p style={{ margin: '4px 0 0', color: '#334155' }}>{entry.minutesLate} minutes late</p>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>{entry.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Attendance;
