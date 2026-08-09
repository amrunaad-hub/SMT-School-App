const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { teacherCanAccessGrade, isParentOfStudent } = require('../utils/classAccess');
const { makeSubjectResolver, listSubjects } = require('../utils/timetableSubjects');

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
    const notes = serializeRows(rows, { boolFields: ['is_locked'] });

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
    // cached per day-of-week since notes span at most 30 days.
    const subjectFor = makeSubjectResolver(db, student.grade, student.division);

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

// GET /api/period-notes/subjects?studentId= — distinct subjects taught to the
// student's grade/division, for populating the subject-wise export picker.
router.get('/subjects', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId is required.' });

    const student = await db('students').where({ id: studentId }).first();
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    if (req.user.role === 'parent' && !(await isParentOfStudent(db, req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }

    const subjects = await listSubjects(db, student.grade, student.division);
    return res.json({ subjects });
  } catch (err) {
    console.error('GET /api/period-notes/subjects error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/period-notes/subject-summary?studentId=&subject=&from=&to= — every
// teaching update for one subject across a date range, for the "collate all
// ICT updates since the start of the year" style parent export.
router.get('/subject-summary', auth, async (req, res) => {
  try {
    const { studentId, subject, from, to } = req.query;
    if (!studentId || !subject || !from || !to) {
      return res.status(400).json({ message: 'studentId, subject, from, and to are required.' });
    }

    const student = await db('students').where({ id: studentId }).first();
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    if (req.user.role === 'parent' && !(await isParentOfStudent(db, req.user.id, studentId))) {
      return res.status(403).json({ message: 'Not your child.' });
    }

    const rows = await db('timetable_period_notes')
      .where({ grade: student.grade, division: student.division })
      .whereBetween('date', [from, to])
      .where((qb) => qb.whereNotNull('classwork').orWhereNotNull('homework').orWhereNotNull('special_instructions'))
      .orderBy('date', 'asc')
      .orderBy('period_index', 'asc');
    const notes = serializeRows(rows);

    const subjectFor = makeSubjectResolver(db, student.grade, student.division);
    const withSubject = await Promise.all(notes.map(async (n) => ({ ...n, subject: await subjectFor(n.date, n.periodIndex) })));
    const matching = withSubject.filter((n) => (n.subject || '').toLowerCase() === subject.toLowerCase());
    if (!matching.length) return res.json({ notes: [] });

    const noteIds = matching.map((n) => n.id);
    const [creatorRows, documents] = await Promise.all([
      db('staff').whereIn('user_id', [...new Set(matching.map((n) => n.createdBy).filter(Boolean))]),
      db('documents').where({ owner_type: 'period_note' }).whereIn('owner_id', noteIds),
    ]);
    const nameByUserId = {};
    creatorRows.forEach((s) => { nameByUserId[s.user_id] = s.display_name; });
    const docsByNote = {};
    documents.forEach((d) => { (docsByNote[d.owner_id] ||= []).push(serializeRow(d)); });

    return res.json({
      notes: matching.map((n) => ({
        id: n.id,
        date: n.date,
        periodIndex: n.periodIndex,
        subject: n.subject,
        senderName: nameByUserId[n.createdBy] || 'Teacher',
        classwork: n.classwork,
        homework: n.homework,
        specialInstructions: n.specialInstructions,
        attachments: docsByNote[n.id] || [],
      })),
    });
  } catch (err) {
    console.error('GET /api/period-notes/subject-summary error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/period-notes (admin/principal/teacher, gated to their own grade) —
// upserts one period's classwork/homework/instructions for a specific date.
// body: { ..., lock? } — `lock: true` (sent by the Submit button) both saves
// and locks the note in the same request, same as attendance's POST /bulk
// `lock` flag. Once locked, only admin/principal can save over it (mirrors
// attendance's PUT /:id lock check) — everyone else must ask one of them to
// unlock it first via POST /unlock below.
router.put('/', auth, authorize(['admin', 'principal', 'teacher']), async (req, res) => {
  try {
    const { grade, division, date, periodIndex, classwork, homework, specialInstructions, lock } = req.body;
    if (!grade || !division || !date || periodIndex === undefined) {
      return res.status(400).json({ message: 'grade, division, date, and periodIndex are required.' });
    }
    if (req.user.role === 'teacher' && !(await teacherCanAccessGrade(db, req.user.id, grade))) {
      return res.status(403).json({ message: 'You are not assigned to this grade.' });
    }

    const key = {
      grade: Number(grade), division: String(division).toLowerCase(), date, period_index: Number(periodIndex),
    };

    const existing = await db('timetable_period_notes').where(key).first();
    if (existing?.is_locked && !['admin', 'principal'].includes(req.user.role)) {
      return res.status(409).json({ message: 'This teaching update is locked. Ask an admin to unlock it first.' });
    }

    const now = new Date().toISOString();

    await db('timetable_period_notes')
      .insert({
        ...key,
        classwork: classwork || null,
        homework: homework || null,
        special_instructions: specialInstructions || null,
        created_by: req.user.id,
        is_locked: !!lock,
        locked_at: lock ? now : null,
        locked_by: lock ? req.user.id : null,
        created_at: now,
        updated_at: now,
      })
      .onConflict(['grade', 'division', 'date', 'period_index'])
      .merge(['classwork', 'homework', 'special_instructions', 'is_locked', 'locked_at', 'locked_by', 'updated_at']);

    const row = await db('timetable_period_notes').where(key).first();
    return res.json(serializeRow(row, { boolFields: ['is_locked'] }));
  } catch (err) {
    console.error('PUT /api/period-notes error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/period-notes/unlock (admin/principal) — clears the lock for one
// grade+division+date+period so the teacher can submit corrections.
router.post('/unlock', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { grade, division, date, periodIndex } = req.body;
    if (!grade || !division || !date || periodIndex === undefined) {
      return res.status(400).json({ message: 'grade, division, date, and periodIndex are required.' });
    }
    const count = await db('timetable_period_notes')
      .where({ grade: Number(grade), division: String(division).toLowerCase(), date, period_index: Number(periodIndex) })
      .update({ is_locked: false, locked_at: null, locked_by: null, updated_at: new Date().toISOString() });
    return res.json({ message: count ? 'Unlocked.' : 'No matching note found.', count });
  } catch (err) {
    console.error('POST /api/period-notes/unlock error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
