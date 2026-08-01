const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');

const JSON_FIELDS = ['periods'];
const serialize = (row) => serializeRow(row, { jsonFields: JSON_FIELDS });

// GET /api/timetable?grade=&division=&day=
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, day, academicYear = '2025-26' } = req.query;

    let query = db('timetables').where({ academic_year: academicYear });
    if (grade) query = query.where({ grade: Number(grade) });
    if (division) query = query.where({ division: String(division).toLowerCase() });
    if (day) query = query.where({ day_of_week: Number(day) });

    // If specific grade+division+day, return single row
    if (grade && division && day) {
      const row = await query.first();
      if (!row) {
        return res.status(404).json({ message: 'Timetable not found for the specified class and day.' });
      }
      return res.json(serialize(row));
    }

    // Otherwise return all matching
    const rows = await query.orderBy([{ column: 'grade' }, { column: 'division' }, { column: 'day_of_week' }]);
    return res.json(serializeRows(rows, { jsonFields: JSON_FIELDS }));
  } catch (err) {
    console.error('GET /api/timetable error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/timetable (upsert)
// body: { grade, division, dayOfWeek, academicYear, periods: [] }
router.put('/', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { grade, division, dayOfWeek, academicYear = '2025-26', periods } = req.body;

    if (!grade || !division || !dayOfWeek) {
      return res.status(400).json({ message: 'grade, division, and dayOfWeek are required.' });
    }

    const key = {
      grade: Number(grade),
      division: String(division).toLowerCase(),
      day_of_week: Number(dayOfWeek),
      academic_year: academicYear,
    };
    const now = new Date().toISOString();

    await db('timetables')
      .insert({ ...key, periods: JSON.stringify(periods || []), created_at: now, updated_at: now })
      .onConflict(['grade', 'division', 'day_of_week', 'academic_year'])
      .merge(['periods', 'updated_at']);

    const row = await db('timetables').where(key).first();
    return res.json(serialize(row));
  } catch (err) {
    console.error('PUT /api/timetable error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
