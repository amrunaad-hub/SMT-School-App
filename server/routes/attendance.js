const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { teacherCanAccessGrade } = require('../utils/classAccess');
const { sendToSubscriptions } = require('../utils/webPush');

// Shapes a joined attendance+student row into the same { ...attendance, student: {...} }
// structure the old Mongoose .populate('student', ...) produced.
function shapeRecord(row) {
  if (!row) return row;
  return {
    _id: String(row.id),
    id: row.id,
    date: row.date,
    grade: row.grade,
    division: row.division,
    rollNo: row.roll_no,
    status: row.status,
    reason: row.reason,
    intimation: row.intimation,
    followUp: row.follow_up,
    markedBy: row.marked_by,
    isLocked: !!row.is_locked,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    student: {
      _id: String(row.student_id),
      firstName: row.s_first_name,
      lastName: row.s_last_name,
      rollNo: row.s_roll_no,
      grade: row.s_grade,
      division: row.s_division,
      studentCode: row.s_student_code,
    },
  };
}

const STUDENT_JOIN_COLUMNS = [
  'attendance.*',
  'students.first_name as s_first_name', 'students.last_name as s_last_name',
  'students.roll_no as s_roll_no', 'students.grade as s_grade',
  'students.division as s_division', 'students.student_code as s_student_code',
];

async function assertGradeAccess(req, res, grade) {
  if (req.user.role === 'admin' || req.user.role === 'principal') return true;
  if (req.user.role === 'teacher' && await teacherCanAccessGrade(db, req.user.id, grade)) return true;
  res.status(403).json({ message: 'You are not assigned to this grade.' });
  return false;
}

async function isParentOfStudent(userId, studentId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return false;
  const link = await db('student_guardians').where({ guardian_id: guardian.id, student_id: studentId }).first();
  return !!link;
}

// GET /api/attendance?date=YYYY-MM-DD&grade=&division=
router.get('/', auth, async (req, res) => {
  try {
    const { date, grade, division } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'date query parameter is required (YYYY-MM-DD).' });
    }

    let query = db('attendance')
      .join('students', 'students.id', 'attendance.student_id')
      .select(STUDENT_JOIN_COLUMNS)
      .where('attendance.date', date);

    if (grade && grade !== 'all') query = query.where('attendance.grade', Number(grade));
    if (division && division !== 'all') query = query.where('attendance.division', String(division).toLowerCase());

    const rows = await query.orderBy([
      { column: 'attendance.grade' }, { column: 'attendance.division' }, { column: 'attendance.roll_no' },
    ]);

    // Any regularization/leave request a parent has filed covering this date,
    // for the students on this list — so a teacher reviewing an already-
    // locked day's records can see a parent's response, not just her own
    // original mark/reason. Same join the roster endpoint below already does
    // pre-lock; this is the equivalent for the post-lock records view.
    const studentIds = rows.map((r) => r.student_id);
    const leaveByStudent = new Map();
    let leaveDocsByLeaveId = {};
    if (studentIds.length) {
      const leaveRows = await db('leave_requests')
        .where('from_date', '<=', date).where('to_date', '>=', date)
        .whereIn('student_id', studentIds)
        .orderBy('created_at', 'desc');
      leaveRows.forEach((l) => { if (!leaveByStudent.has(l.student_id)) leaveByStudent.set(l.student_id, l); });

      const leaveIds = leaveRows.map((l) => l.id);
      if (leaveIds.length) {
        const docs = await db('documents').where({ owner_type: 'leave_request' }).whereIn('owner_id', leaveIds);
        docs.forEach((d) => {
          if (!leaveDocsByLeaveId[d.owner_id]) leaveDocsByLeaveId[d.owner_id] = [];
          leaveDocsByLeaveId[d.owner_id].push({ id: d.id, docType: d.doc_type, fileUrl: d.file_url, originalFilename: d.original_filename });
        });
      }
    }

    return res.json(rows.map((row) => {
      const shaped = shapeRecord(row);
      const leave = leaveByStudent.get(row.student_id);
      shaped.leaveRequest = leave
        ? { id: leave.id, type: leave.type, category: leave.category, fromDate: leave.from_date, toDate: leave.to_date, reason: leave.reason, status: leave.status, submittedAt: leave.created_at, documents: leaveDocsByLeaveId[leave.id] || [] }
        : null;
      return shaped;
    }));
  } catch (err) {
    console.error('GET /api/attendance error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/roster?date=&grade=&division= — the class roster with a
// computed default status per student: 'Absent' if a leave_requests row covers
// this date, else the already-saved attendance status, else 'Present'. This is
// what the teacher-facing attendance modal initializes from.
router.get('/roster', auth, async (req, res) => {
  try {
    const { date, grade, division } = req.query;
    if (!date || !grade || !division) {
      return res.status(400).json({ message: 'date, grade, and division are required.' });
    }
    if (!(await assertGradeAccess(req, res, grade))) return;

    const students = await db('students')
      .where({ grade: Number(grade), division: String(division).toLowerCase(), status: 'Active' })
      .orderBy('roll_no');

    const [existingRows, leaveRows] = await Promise.all([
      db('attendance').where({ date, grade: Number(grade), division: String(division).toLowerCase() }),
      db('leave_requests').where('from_date', '<=', date).where('to_date', '>=', date)
        .whereIn('student_id', students.map((s) => s.id)),
    ]);
    const existingByStudent = Object.fromEntries(existingRows.map((r) => [r.student_id, r]));
    const leaveByStudent = new Map(leaveRows.map((r) => [r.student_id, r]));

    const leaveDocsByLeaveId = {};
    if (leaveRows.length > 0) {
      const docs = await db('documents').where({ owner_type: 'leave_request' }).whereIn('owner_id', leaveRows.map((r) => r.id));
      docs.forEach((d) => {
        if (!leaveDocsByLeaveId[d.owner_id]) leaveDocsByLeaveId[d.owner_id] = [];
        leaveDocsByLeaveId[d.owner_id].push({ id: d.id, docType: d.doc_type, fileUrl: d.file_url, originalFilename: d.original_filename });
      });
    }

    const roster = students.map((s) => {
      const existing = existingByStudent[s.id];
      const leave = leaveByStudent.get(s.id);
      const defaultStatus = leave ? 'Absent' : 'Present';
      return {
        studentId: s.id,
        studentCode: s.student_code,
        firstName: s.first_name,
        lastName: s.last_name,
        rollNo: s.roll_no,
        status: existing ? existing.status : defaultStatus,
        reason: existing ? existing.reason : (leave ? `On approved ${leave.category || 'Casual'} leave` : ''),
        isOnLeave: !!leave,
        leaveRequest: leave ? {
          id: leave.id, type: leave.type, category: leave.category,
          fromDate: leave.from_date, toDate: leave.to_date, reason: leave.reason, status: leave.status,
          documents: leaveDocsByLeaveId[leave.id] || [],
        } : null,
        isLocked: existing ? !!existing.is_locked : false,
      };
    });

    return res.json({ roster, isLocked: existingRows.length > 0 && existingRows.every((r) => r.is_locked) });
  } catch (err) {
    console.error('GET /api/attendance/roster error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/bulk
// body: { date, grade, division, records: [{studentId, status, reason, intimation, followUp}], lock }
router.post('/bulk', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const { date, grade, division, records, lock } = req.body;

    if (!date || !grade || !division || !Array.isArray(records)) {
      return res.status(400).json({ message: 'date, grade, division, and records[] are required.' });
    }
    if (!(await assertGradeAccess(req, res, grade))) return;

    const divisionLower = String(division).toLowerCase();
    const existingLocked = await db('attendance')
      .where({ date, grade: Number(grade), division: divisionLower, is_locked: true }).first();
    if (existingLocked && !['admin', 'principal'].includes(req.user.role)) {
      return res.status(409).json({ message: 'Attendance for this class and date is locked. Ask an admin to unlock it first.' });
    }

    const now = new Date().toISOString();
    let saved = 0;

    // Same "does a leave request cover this date" check the /roster and
    // /student endpoints use, batched up front so locking a whole class
    // doesn't fire one leave_requests query per student.
    const studentIds = records.map((rec) => rec.studentId);
    const coveringLeaveIds = new Set(
      studentIds.length
        ? (await db('leave_requests').where('from_date', '<=', date).where('to_date', '>=', date).whereIn('student_id', studentIds))
            .map((l) => l.student_id)
        : []
    );

    const describeStatus = (status, studentId) => {
      if (status === 'Absent') {
        return coveringLeaveIds.has(studentId) ? 'Absent (Leave Approved)' : 'Absent (No Leave Application)';
      }
      return status || 'Present';
    };

    for (const rec of records) {
      const student = await db('students').where({ id: rec.studentId }).first();
      if (!student) continue;

      await db('attendance')
        .insert({
          date,
          student_id: rec.studentId,
          grade: student.grade,
          division: student.division,
          roll_no: student.roll_no,
          status: rec.status || 'Present',
          reason: rec.reason || '',
          intimation: rec.intimation || '',
          follow_up: rec.followUp || '',
          marked_by: req.user.id,
          is_locked: !!lock,
          locked_at: lock ? now : null,
          locked_by: lock ? req.user.id : null,
          created_at: now,
          updated_at: now,
        })
        .onConflict(['date', 'student_id'])
        .merge(['status', 'reason', 'intimation', 'follow_up', 'marked_by', 'is_locked', 'locked_at', 'locked_by', 'updated_at']);
      saved += 1;

      if (lock) {
        const link = await db('student_guardians').where({ student_id: rec.studentId, is_primary: true }).first()
          || await db('student_guardians').where({ student_id: rec.studentId }).first();
        if (link) {
          const guardian = await db('guardians').where({ id: link.guardian_id }).first();
          if (guardian && guardian.user_id) {
            const statusLabel = describeStatus(rec.status, rec.studentId);
            const title = `Attendance marked for ${date}`;
            const body = `${student.first_name} ${student.last_name} was marked ${statusLabel} on ${date}.`;
            await db('notifications').insert({
              user_id: guardian.user_id,
              title,
              body,
              related_type: 'attendance',
              related_id: rec.studentId,
              created_at: now,
            });
            const subs = await db('push_subscriptions').where({ user_id: guardian.user_id });
            if (subs.length) {
              sendToSubscriptions(db, subs, { title, body, url: `/parents?module=attendance&date=${date}` })
                .catch((err) => console.error('[webPush] attendance notify failed:', err.message));
            }
          }
        }
      }
    }

    return res.json({ message: `${saved} attendance records saved.`, count: saved, locked: !!lock });
  } catch (err) {
    console.error('POST /api/attendance/bulk error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/unlock (admin/principal) — clears the lock for a
// date+grade+division so corrections can be made.
router.post('/unlock', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { date, grade, division } = req.body;
    if (!date || !grade || !division) {
      return res.status(400).json({ message: 'date, grade, and division are required.' });
    }
    const count = await db('attendance')
      .where({ date, grade: Number(grade), division: String(division).toLowerCase() })
      .update({ is_locked: false, locked_at: null, locked_by: null, updated_at: new Date().toISOString() });
    return res.json({ message: `Unlocked ${count} attendance record(s).`, count });
  } catch (err) {
    console.error('POST /api/attendance/unlock error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/attendance/:id
router.put('/:id', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const existing = await db('attendance').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ message: 'Attendance record not found.' });
    if (existing.is_locked && !['admin', 'principal'].includes(req.user.role)) {
      return res.status(409).json({ message: 'This attendance record is locked. Ask an admin to unlock it first.' });
    }
    if (req.user.role === 'teacher' && !(await teacherCanAccessGrade(db, req.user.id, existing.grade))) {
      return res.status(403).json({ message: 'You are not assigned to this grade.' });
    }

    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.reason !== undefined) updates.reason = req.body.reason;
    if (req.body.intimation !== undefined) updates.intimation = req.body.intimation;
    if (req.body.followUp !== undefined) updates.follow_up = req.body.followUp;
    updates.updated_at = new Date().toISOString();

    await db('attendance').where({ id: req.params.id }).update(updates);

    const row = await db('attendance')
      .join('students', 'students.id', 'attendance.student_id')
      .select(STUDENT_JOIN_COLUMNS)
      .where('attendance.id', req.params.id).first();
    return res.json(shapeRecord(row));
  } catch (err) {
    console.error('PUT /api/attendance/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

function shapeLeaveRequest(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    category: row.category,
    fromDate: row.from_date,
    toDate: row.to_date,
    reason: row.reason,
    status: row.status,
    submittedAt: row.created_at,
    approvedBy: null,
    approvedAt: row.status !== 'Pending' ? row.updated_at : null,
  };
}

// GET /api/attendance/leave-requests?studentId=
router.get('/leave-requests', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required.' });
    }
    if (req.user.role === 'parent' && !(await isParentOfStudent(req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }
    const requests = await db('leave_requests').where({ student_id: studentId }).orderBy('created_at', 'desc');
    return res.json({ leaveRequests: requests.map(shapeLeaveRequest) });
  } catch (err) {
    console.error('GET /api/attendance/leave-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/leave-requests — takes effect immediately (no approval
// gate): the roster endpoint above treats any leave_requests row covering the
// date as an automatic Absent default, overridable by the marking teacher.
router.post('/leave-requests', auth, async (req, res) => {
  try {
    const { studentId, fromDate, toDate, reason, category } = req.body;
    if (!studentId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'studentId, fromDate, toDate, and reason are required.' });
    }
    if (req.user.role === 'parent' && !(await isParentOfStudent(req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }

    // Advance vs. regularization isn't a parent choice — it's evident from
    // the dates: a leave starting today or later is applied in advance, one
    // starting before today is filed after the fact.
    const todayStr = new Date().toISOString().slice(0, 10);
    const type = fromDate < todayStr ? 'regularization' : 'advance';

    const now = new Date().toISOString();
    const [id] = await db('leave_requests').insert({
      student_id: studentId, type, category: ['Medical', 'Casual'].includes(category) ? category : 'Casual',
      from_date: fromDate, to_date: toDate, reason,
      requested_by: req.user.id, created_at: now, updated_at: now,
    });
    const row = await db('leave_requests').where({ id }).first();
    return res.status(201).json(shapeLeaveRequest(row));
  } catch (err) {
    console.error('POST /api/attendance/leave-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/student/:studentId?year=&month= (month is 1-12) — a
// student's attendance for one calendar month, shaped for the parent portal's
// calendar: { date, status: 'present'|'absent', type, reason }. Absences are
// cross-referenced against leave_requests covering that date to distinguish
// approved-leave / unregularized.
//
// leave_requests.status is NOT used for this: per the /leave-requests POST
// above, a leave request "takes effect immediately (no approval gate)" and
// nothing in this app ever transitions it off 'Pending' — so gating on that
// status previously left every leave-covered absence permanently reading
// "pending approval" even after a teacher had marked/locked the actual
// attendance row, which is the real signal that the absence is settled.
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'year and month (1-12) query parameters are required.' });
    }

    const student = await db('students').where({ id: studentId }).first();
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    if (req.user.role === 'parent' && !(await isParentOfStudent(req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }
    if (req.user.role === 'teacher' && !(await teacherCanAccessGrade(db, req.user.id, student.grade))) {
      return res.status(403).json({ message: 'You are not assigned to this grade.' });
    }

    const monthStr = String(month).padStart(2, '0');
    const fromDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const [attendanceRows, leaveRows] = await Promise.all([
      db('attendance').where({ student_id: studentId }).whereBetween('date', [fromDate, toDate]).orderBy('date'),
      db('leave_requests').where({ student_id: studentId }).where('from_date', '<=', toDate).where('to_date', '>=', fromDate),
    ]);

    const findLeave = (date) => leaveRows.find((l) => l.from_date <= date && l.to_date >= date);

    const days = attendanceRows.map((row) => {
      if (row.status === 'Absent') {
        const leave = findLeave(row.date);
        if (leave) {
          return { date: row.date, status: 'absent', type: 'approved-leave', reason: leave.reason };
        }
        return { date: row.date, status: 'absent', type: 'unregularized', reason: row.reason || 'Absent' };
      }
      return { date: row.date, status: 'present', type: 'regular', reason: row.reason || null };
    });

    return res.json({ days });
  } catch (err) {
    console.error('GET /api/attendance/student/:studentId error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
