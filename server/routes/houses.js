const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { serializeRows } = require('../utils/serialize');

// GET /api/houses — the fixed lookup list (seeded in migration 003), used to
// populate house-assignment dropdowns across Admissions/SIS/StudentProfile.
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db('houses').orderBy('name', 'asc');
    return res.json({ houses: serializeRows(rows) });
  } catch (err) {
    console.error('GET /api/houses error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
