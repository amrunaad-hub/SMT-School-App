const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

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

    return res.json(rows.map(shapeRecord));
  } catch (err) {
    console.error('GET /api/attendance error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/bulk
// body: { date, grade, division, records: [{studentId, status, reason, intimation, followUp}] }
router.post('/bulk', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const { date, grade, division, records } = req.body;

    if (!date || !grade || !division || !Array.isArray(records)) {
      return res.status(400).json({ message: 'date, grade, division, and records[] are required.' });
    }

    const now = new Date().toISOString();
    let saved = 0;

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
          created_at: now,
          updated_at: now,
        })
        .onConflict(['date', 'student_id'])
        .merge(['status', 'reason', 'intimation', 'follow_up', 'marked_by', 'updated_at']);
      saved += 1;
    }

    return res.json({ message: `${saved} attendance records saved.`, count: saved });
  } catch (err) {
    console.error('POST /api/attendance/bulk error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/attendance/:id
router.put('/:id', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.reason !== undefined) updates.reason = req.body.reason;
    if (req.body.intimation !== undefined) updates.intimation = req.body.intimation;
    if (req.body.followUp !== undefined) updates.follow_up = req.body.followUp;
    updates.updated_at = new Date().toISOString();

    const count = await db('attendance').where({ id: req.params.id }).update(updates);
    if (!count) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

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

// In-memory leave requests store (simple, no separate table needed yet).
// For a proper implementation these would be in their own SQLite table.
const leaveStore = {}; // studentId -> [{id, ...}]

// GET /api/attendance/leave-requests?studentId=
router.get('/leave-requests', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required.' });
    }
    const requests = leaveStore[studentId] || [];
    return res.json({ leaveRequests: requests });
  } catch (err) {
    console.error('GET /api/attendance/leave-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/leave-requests
router.post('/leave-requests', auth, async (req, res) => {
  try {
    const { studentId, type, fromDate, toDate, reason } = req.body;
    if (!studentId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'studentId, fromDate, toDate, and reason are required.' });
    }
    if (!leaveStore[studentId]) leaveStore[studentId] = [];
    const existingCount = leaveStore[studentId].length;
    const newReq = {
      id: `LR-${String(existingCount + 1).padStart(3, '0')}`,
      studentId,
      type: type || 'advance',
      fromDate,
      toDate,
      reason,
      status: 'Pending',
      submittedAt: new Date().toLocaleString('en-IN'),
      approvedBy: null,
      approvedAt: null,
    };
    leaveStore[studentId].push(newReq);
    return res.status(201).json(newReq);
  } catch (err) {
    console.error('POST /api/attendance/leave-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
