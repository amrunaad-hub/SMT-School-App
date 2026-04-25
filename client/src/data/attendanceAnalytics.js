import { DIVISIONS, GRADES, STUDENTS_PER_DIVISION, getStudentById } from './studentDirectory';

const DEFAULT_ATTENDANCE_DATE = '2026-04-18';

const attendanceDates = ['2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18'];

const absenteeLedger = {
  '2026-04-14': [
    { studentId: '1-alpha-2', reason: 'Viral fever', intimation: 'Advance leave', followUp: 'Medical certificate shared at 7:15 AM' },
    { studentId: '2-beta-5', reason: 'Family travel', intimation: 'Advance leave', followUp: 'Parent notified class teacher previous evening' },
    { studentId: '5-gamma-9', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Office called at 9:20 AM' },
    { studentId: '7-beta-11', reason: 'Dental appointment', intimation: 'Advance leave', followUp: 'Half-day request marked in ERP' },
    { studentId: '9-alpha-14', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Transport team informed security desk' },
  ],
  '2026-04-15': [
    { studentId: '1-beta-4', reason: 'Stomach infection', intimation: 'Advance leave', followUp: 'Parent email received at 6:55 AM' },
    { studentId: '3-alpha-7', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Second call placed at 10:05 AM' },
    { studentId: '4-gamma-16', reason: 'Personal work at home', intimation: 'Advance leave', followUp: 'Leave note uploaded by guardian' },
    { studentId: '6-beta-8', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Coordinator escalated to section head' },
    { studentId: '8-alpha-10', reason: 'Migraine', intimation: 'Advance leave', followUp: 'Prescription photo attached in app' },
    { studentId: '10-gamma-12', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Counsellor follow-up planned' },
  ],
  '2026-04-16': [
    { studentId: '2-alpha-6', reason: 'Fever observation at home', intimation: 'Advance leave', followUp: 'Parent called reception at 7:05 AM' },
    { studentId: '3-beta-18', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Bus attendant confirmed no pickup' },
    { studentId: '5-alpha-21', reason: 'Religious function', intimation: 'Advance leave', followUp: 'Approved one-day leave' },
    { studentId: '6-gamma-3', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'SMS reminder sent to parent' },
    { studentId: '7-alpha-17', reason: 'Sports injury recovery', intimation: 'Advance leave', followUp: 'PE teacher informed admin office' },
    { studentId: '9-gamma-6', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Parent promised update by noon' },
  ],
  '2026-04-17': [
    { studentId: '1-gamma-5', reason: 'Cough and cold', intimation: 'Advance leave', followUp: 'Doctor consultation note uploaded' },
    { studentId: '2-alpha-11', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Section coordinator called twice' },
    { studentId: '4-beta-13', reason: 'Family ceremony', intimation: 'Advance leave', followUp: 'Approved from class teacher' },
    { studentId: '5-beta-4', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Principal office requested urgent callback' },
    { studentId: '8-gamma-8', reason: 'Eye infection', intimation: 'Advance leave', followUp: 'Parent shared doctor prescription' },
    { studentId: '10-alpha-7', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Attendance team marked for follow-up' },
  ],
  '2026-04-18': [
    { studentId: '1-alpha-3', reason: 'Fever and rest advised', intimation: 'Advance leave', followUp: 'Parent informed class teacher at 6:45 AM' },
    { studentId: '1-beta-12', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Reception called at 8:55 AM' },
    { studentId: '2-alpha-4', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Transport staff reported student not boarded' },
    { studentId: '2-gamma-9', reason: 'Family emergency', intimation: 'Advance leave', followUp: 'Emergency leave approved by coordinator' },
    { studentId: '3-alpha-8', reason: 'Dental procedure', intimation: 'Advance leave', followUp: 'Half-day to full-day leave converted' },
    { studentId: '3-beta-6', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Section head awaiting callback' },
    { studentId: '5-gamma-7', reason: 'Stomach upset', intimation: 'Advance leave', followUp: 'Parent message logged in ERP' },
    { studentId: '6-alpha-14', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Parent call escalated to principal office' },
    { studentId: '7-beta-9', reason: 'Inter-school event travel', intimation: 'Advance leave', followUp: 'Competition movement order approved' },
    { studentId: '8-gamma-10', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Home visit to be evaluated if unresolved' },
    { studentId: '9-alpha-16', reason: 'Migraine observation', intimation: 'Advance leave', followUp: 'Medical note shared with school nurse' },
    { studentId: '10-beta-5', reason: 'No response from parent', intimation: 'No prior intimation', followUp: 'Senior coordinator contacted guardian' },
  ],
};

const advanceLeaveRequests = [
  { id: 1, studentId: '1-alpha-3', date: '2026-04-18', type: 'Medical leave', notice: 'Shared before 7:00 AM' },
  { id: 2, studentId: '2-gamma-9', date: '2026-04-18', type: 'Family emergency', notice: 'Parent spoke to coordinator' },
  { id: 3, studentId: '7-beta-9', date: '2026-04-18', type: 'Official event movement', notice: 'Approved by activity desk' },
  { id: 4, studentId: '9-alpha-16', date: '2026-04-18', type: 'Medical observation', notice: 'School nurse informed' },
];

const lateArrivals = {
  '2026-04-18': [
    { studentId: '1-gamma-15', minutesLate: 12, note: 'Traffic delay on Route C' },
    { studentId: '4-beta-6', minutesLate: 18, note: 'Parent drop delayed due to road closure' },
    { studentId: '8-alpha-20', minutesLate: 9, note: 'Arrived after medical appointment' },
  ],
};

const enrichAbsenceEntry = (date, entry) => {
  const student = getStudentById(entry.studentId);
  if (!student) {
    return null;
  }

  return {
    date,
    studentId: entry.studentId,
    studentName: student.name,
    grade: student.grade,
    division: student.division,
    rollNo: student.rollNo,
    reason: entry.reason,
    intimation: entry.intimation,
    followUp: entry.followUp,
  };
};

const getAbsenteesForDate = (date = DEFAULT_ATTENDANCE_DATE) => {
  return (absenteeLedger[date] || [])
    .map((entry) => enrichAbsenceEntry(date, entry))
    .filter(Boolean);
};

const getAttendanceStatsForDate = (date = DEFAULT_ATTENDANCE_DATE) => {
  const absentees = getAbsenteesForDate(date);
  const byClass = new Map();

  GRADES.forEach((grade) => {
    DIVISIONS.forEach((division) => {
      byClass.set(`${grade}-${division}`, []);
    });
  });

  absentees.forEach((entry) => {
    byClass.get(`${entry.grade}-${entry.division}`)?.push(entry);
  });

  const gradeStats = GRADES.map((grade) => {
    const divisions = DIVISIONS.map((division) => {
      const absentStudents = byClass.get(`${grade}-${division}`) || [];
      const absent = absentStudents.length;
      const present = STUDENTS_PER_DIVISION - absent;
      const attendancePercent = Math.round((present / STUDENTS_PER_DIVISION) * 100);

      return {
        division,
        label: `Division ${division.charAt(0).toUpperCase()}${division.slice(1)}`,
        present,
        absent,
        attendancePercent,
        absentStudents,
      };
    });

    const present = divisions.reduce((sum, division) => sum + division.present, 0);
    const absent = divisions.reduce((sum, division) => sum + division.absent, 0);
    const attendancePercent = Math.round((present / (STUDENTS_PER_DIVISION * DIVISIONS.length)) * 100);

    return {
      grade,
      label: `Grade ${grade}`,
      present,
      absent,
      attendancePercent,
      divisions,
    };
  });

  const totalPresent = gradeStats.reduce((sum, grade) => sum + grade.present, 0);
  const totalAbsent = gradeStats.reduce((sum, grade) => sum + grade.absent, 0);
  const totalStrength = totalPresent + totalAbsent;

  return {
    absentees,
    gradeStats,
    totals: {
      present: totalPresent,
      absent: totalAbsent,
      attendancePercent: totalStrength > 0 ? Math.round((totalPresent / totalStrength) * 100) : 0,
      noIntimationCount: absentees.filter((entry) => entry.intimation === 'No prior intimation').length,
      advanceLeaveCount: absentees.filter((entry) => entry.intimation === 'Advance leave').length,
      lateArrivalCount: (lateArrivals[date] || []).length,
    },
  };
};

const weeklyAttendanceTrend = attendanceDates.map((date) => {
  const stats = getAttendanceStatsForDate(date);
  const dateObj = new Date(`${date}T00:00:00`);
  return {
    date,
    label: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
    absent: stats.totals.absent,
    attendancePercent: stats.totals.attendancePercent,
    noIntimationCount: stats.totals.noIntimationCount,
  };
});

const commandCenterAttendanceCards = getAttendanceStatsForDate(DEFAULT_ATTENDANCE_DATE).gradeStats
  .sort((left, right) => right.absent - left.absent)
  .slice(0, 4)
  .map((grade) => ({
    grade: grade.grade,
    label: grade.label,
    absent: grade.absent,
    attendancePercent: grade.attendancePercent,
    topDivision: grade.divisions.reduce((highest, division) => division.absent > highest.absent ? division : highest, grade.divisions[0]),
  }));

export {
  DEFAULT_ATTENDANCE_DATE,
  advanceLeaveRequests,
  commandCenterAttendanceCards,
  getAbsenteesForDate,
  getAttendanceStatsForDate,
  lateArrivals,
  weeklyAttendanceTrend,
};