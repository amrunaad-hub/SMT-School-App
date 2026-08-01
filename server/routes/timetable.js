const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// GET /api/timetable?grade=&division=&day=
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, day, academicYear = '2025-26' } = req.query;

    const filter = { academicYear };

    if (grade) filter.grade = Number(grade);
    if (division) filter.division = String(division).toLowerCase();
    if (day) filter.dayOfWeek = Number(day);

    // If specific grade+division+day, return single doc
    if (grade && division && day) {
      const doc = await Timetable.findOne(filter).lean();
      if (!doc) {
        return res.status(404).json({ message: 'Timetable not found for the specified class and day.' });
      }
      return res.json(doc);
    }

    // Otherwise return all matching
    const docs = await Timetable.find(filter).sort({ grade: 1, division: 1, dayOfWeek: 1 }).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /api/timetable error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/timetable (upsert)
// body: { grade, division, dayOfWeek, academicYear, periods: [] }
router.put('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const { grade, division, dayOfWeek, academicYear = '2025-26', periods } = req.body;

    if (!grade || !division || !dayOfWeek) {
      return res.status(400).json({ message: 'grade, division, and dayOfWeek are required.' });
    }

    const filter = {
      grade: Number(grade),
      division: String(division).toLowerCase(),
      dayOfWeek: Number(dayOfWeek),
      academicYear,
    };

    const doc = await Timetable.findOneAndUpdate(
      filter,
      { $set: { ...filter, periods: periods || [] } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json(doc);
  } catch (err) {
    console.error('PUT /api/timetable error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
