const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { teacherCanAccessGrade, isParentOfStudent } = require('../utils/classAccess');

// GET /api/period-notes?grade=&division=&date= — the sparse per-date overlay
// on top of the weekly `timetables` template (classwork/homework/instructions
// a teacher added for that specific day, if any).
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, date } = req.query;
    if (!grade || !division || !date) {
      return res.status(400).json({ message: 'grade, division, and date are required.' });
    }
    const rows = await db('timetable_period_notes')
      .where({ grade: Number(grade), division: String(division).toLowerCase(), date })
      .orderBy('period_index');
    const notes = serializeRows(rows);

    const noteIds = notes.map((n) => n.id);
    const [documents, readRows] = await Promise.all([
      noteIds.length ? db('documents').where({ owner_type: 'period_note' }).whereIn('owner_id', noteIds) : [],
      noteIds.length ? db('period_note_reads').whereIn('period_note_id', noteIds).select('period_note_id') : [],
    ]);
    const docsByNote = {};
    documents.forEach((d) => { (docsByNote[d.owner_id] ||= []).push(serializeRow(d)); });
    const openCountByNote = {};
    readRows.forEach((r) => { openCountByNote[r.period_note_id] = (openCountByNote[r.period_note_id] || 0) + 1; });

    return res.json({ notes: notes.map((n) => ({ ...n, attachments: docsByNote[n.id] || [], openCount: openCountByNote[n.id] || 0 })) });
  } catch (err) {
    console.error('GET /api/period-notes error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/period-notes/mine?studentId= — recent teaching-update notes (only
// ones with actual content) for the student's grade/division, newest first,
// shaped like the notices feed: sender name, subject, isRead for this parent.
router.get('/mine', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId is required.' });

    const student = await db('students').where({ id: studentId }).first();
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    if (req.user.role === 'parent' && !(await isParentOfStudent(db, req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }

    const rows = await db('timetable_period_notes')
      .where({ grade: student.grade, division: student.division })
      .where((qb) => qb.whereNotNull('classwork').orWhereNotNull('homework').orWhereNotNull('special_instructions'))
      .orderBy('date', 'desc')
      .orderBy('period_index', 'desc')
      .limit(30);
    const notes = serializeRows(rows);
    if (!notes.length) return res.json({ notes: [] });

    const noteIds = notes.map((n) => n.id);
    const [readRows, creatorRows, documents] = await Promise.all([
      db('period_note_reads').where({ user_id: req.user.id }).whereIn('period_note_id', noteIds),
      db('staff').whereIn('user_id', [...new Set(notes.map((n) => n.createdBy).filter(Boolean))]),
      db('documents').where({ owner_type: 'period_note' }).whereIn('owner_id', noteIds),
    ]);
    const readIds = new Set(readRows.map((r) => r.period_note_id));
    const nameByUserId = {};
    creatorRows.forEach((s) => { nameByUserId[s.user_id] = s.display_name; });
    const docsByNote = {};
    documents.forEach((d) => { (docsByNote[d.owner_id] ||= []).push(serializeRow(d)); });

    // Resolve each note's subject from the matching weekly timetable slot —
    // cached per (division, day-of-week) since notes span at most 30 days.
    const timetableCache = {};
    const subjectFor = async (date, periodIndex) => {
      const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (jsDay === 0) return null;
      const cacheKey = `${student.division}-${jsDay}`;
      if (!(cacheKey in timetableCache)) {
        timetableCache[cacheKey] = await db('timetables')
          .where({ grade: student.grade, division: student.division, day_of_week: jsDay })
          .first();
      }
      const row = timetableCache[cacheKey];
      if (!row) return null;
      const periods = JSON.parse(row.periods || '[]');
      const period = periods.find((p) => p.periodIndex === periodIndex);
      return period ? period.subject : null;
    };

    const shaped = await Promise.all(notes.map(async (n) => ({
      id: n.id,
      date: n.date,
      periodIndex: n.periodIndex,
      subject: await subjectFor(n.date, n.periodIndex),
      senderName: nameByUserId[n.createdBy] || 'Teacher',
      classwork: n.classwork,
      homework: n.homework,
      specialInstructions: n.specialInstructions,
      isRead: readIds.has(n.id),
      attachments: docsByNote[n.id] || [],
    })));

    return res.json({ notes: shaped });
  } catch (err) {
    console.error('GET /api/period-notes/mine error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/period-notes/:id/read — idempotent; feeds the teacher-facing
// openCount on the GET / response above.
router.post('/:id/read', auth, async (req, res) => {
  try {
    await db('period_note_reads')
      .insert({ period_note_id: req.params.id, user_id: req.user.id, opened_at: new Date().toISOString() })
      .onConflict(['period_note_id', 'user_id']).ignore();
    return res.json({ message: 'Recorded.' });
  } catch (err) {
    console.error('POST /api/period-notes/:id/read error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/period-notes (admin/principal/teacher, gated to their own grade) —
// upserts one period's classwork/homework/instructions for a specific date.
router.put('/', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const { grade, division, date, periodIndex, classwork, homework, specialInstructions } = req.body;
    if (!grade || !division || !date || periodIndex === undefined) {
      return res.status(400).json({ message: 'grade, division, date, and periodIndex are required.' });
    }
    if (req.user.role === 'teacher' && !(await teacherCanAccessGrade(db, req.user.id, grade))) {
      return res.status(403).json({ message: 'You are not assigned to this grade.' });
    }

    const key = {
      grade: Number(grade), division: String(division).toLowerCase(), date, period_index: Number(periodIndex),
    };
    const now = new Date().toISOString();

    await db('timetable_period_notes')
      .insert({
        ...key,
        classwork: classwork || null,
        homework: homework || null,
        special_instructions: specialInstructions || null,
        created_by: req.user.id,
        created_at: now,
        updated_at: now,
      })
      .onConflict(['grade', 'division', 'date', 'period_index'])
      .merge(['classwork', 'homework', 'special_instructions', 'updated_at']);

    const row = await db('timetable_period_notes').where(key).first();
    return res.json(serializeRow(row));
  } catch (err) {
    console.error('PUT /api/period-notes error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
