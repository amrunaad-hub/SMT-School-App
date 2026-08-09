const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');

const serialize = (row) => serializeRow(row);

const CAMEL_TO_SNAKE = {
  title: 'title', subject: 'subject', grade: 'grade', division: 'division', type: 'type',
  scheduledDate: 'scheduled_date', scheduledTime: 'scheduled_time', durationMinutes: 'duration_minutes',
  maxMarks: 'max_marks', passingMarks: 'passing_marks', venue: 'venue', invigilator: 'invigilator',
  status: 'status', academicYear: 'academic_year',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

// Auto-generate examCode
const generateExamCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `EX-${year}-`;
  const last = await db('exams').where('exam_code', 'like', `${prefix}%`).orderBy('exam_code', 'desc').first();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.exam_code.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/exams
router.get('/', auth, async (req, res) => {
  try {
    const { grade, subject, status, academicYear } = req.query;
    let query = db('exams');
    if (grade && grade !== 'all') query = query.where({ grade: Number(grade) });
    if (subject && subject !== 'all') query = query.whereILike('subject', `%${subject}%`);
    if (status && status !== 'all') query = query.where({ status });
    if (academicYear) query = query.where({ academic_year: academicYear });

    const rows = await query.orderBy('scheduled_date', 'asc');
    const exams = serializeRows(rows);
    return res.json({ exams, total: exams.length });
  } catch (err) {
    console.error('GET /api/exams error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/exams/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await db('exams').where({ id: req.params.id }).first();
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(serialize(exam));
  } catch (err) {
    console.error('GET /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/exams (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const examCode = await generateExamCode();
    const now = new Date().toISOString();
    const [{ id }] = await db('exams').insert({
      ...bodyToRow(req.body), exam_code: examCode, created_at: now, updated_at: now,
    }).returning('id');
    const exam = await db('exams').where({ id }).first();
    return res.status(201).json(serialize(exam));
  } catch (err) {
    console.error('POST /api/exams error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate exam code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/exams/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('exams').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Exam not found.' });
    const exam = await db('exams').where({ id: req.params.id }).first();
    return res.json(serialize(exam));
  } catch (err) {
    console.error('PUT /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/exams/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('exams').where({ id: req.params.id }).delete(); // exam_results cascade via FK
    if (!count) return res.status(404).json({ message: 'Exam not found.' });
    return res.json({ message: 'Exam and results deleted.' });
  } catch (err) {
    console.error('DELETE /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/exams/:id/results
router.get('/:id/results', auth, async (req, res) => {
  try {
    const rows = await db('exam_results')
      .join('students', 'students.id', 'exam_results.student_id')
      .select(
        'exam_results.*',
        'students.first_name as s_first_name', 'students.last_name as s_last_name',
        'students.roll_no as s_roll_no', 'students.grade as s_grade',
        'students.division as s_division', 'students.student_code as s_student_code',
      )
      .where('exam_results.exam_id', req.params.id)
      .orderBy('students.roll_no', 'asc');

    const results = rows.map((row) => ({
      ...serializeRow(row, { boolFields: ['is_absent'] }),
      student: {
        _id: String(row.student_id),
        firstName: row.s_first_name,
        lastName: row.s_last_name,
        rollNo: row.s_roll_no,
        grade: row.s_grade,
        division: row.s_division,
        studentCode: row.s_student_code,
      },
    }));
    return res.json({ results, total: results.length });
  } catch (err) {
    console.error('GET /api/exams/:id/results error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/exams/:id/results (admin) — bulk upsert
router.post('/:id/results', auth, authorize(['admin']), async (req, res) => {
  try {
    const { records } = req.body; // [{studentId, marksObtained, isAbsent, remarks}]
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'records[] array is required.' });
    }

    const exam = await db('exams').where({ id: req.params.id }).first();
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const computeGrade = (marks, max) => {
      const pct = (marks / max) * 100;
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C';
      if (pct >= 35) return 'D';
      return 'F';
    };

    const now = new Date().toISOString();
    for (const rec of records) {
      await db('exam_results')
        .insert({
          exam_id: req.params.id,
          student_id: rec.studentId,
          is_absent: rec.isAbsent ? 1 : 0,
          marks_obtained: rec.isAbsent ? null : Number(rec.marksObtained),
          grade: rec.isAbsent ? null : computeGrade(Number(rec.marksObtained), exam.max_marks),
          remarks: rec.remarks || '',
          created_at: now,
          updated_at: now,
        })
        .onConflict(['exam_id', 'student_id'])
        .merge(['is_absent', 'marks_obtained', 'grade', 'remarks', 'updated_at']);
    }

    return res.json({ message: `${records.length} results saved.` });
  } catch (err) {
    console.error('POST /api/exams/:id/results error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
