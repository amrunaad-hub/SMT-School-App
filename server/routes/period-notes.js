const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { teacherCanAccessGrade } = require('../utils/classAccess');

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
    const documents = noteIds.length
      ? await db('documents').where({ owner_type: 'period_note' }).whereIn('owner_id', noteIds)
      : [];
    const docsByNote = {};
    documents.forEach((d) => { (docsByNote[d.owner_id] ||= []).push(serializeRow(d)); });

    return res.json({ notes: notes.map((n) => ({ ...n, attachments: docsByNote[n.id] || [] })) });
  } catch (err) {
    console.error('GET /api/period-notes error:', err.message);
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
