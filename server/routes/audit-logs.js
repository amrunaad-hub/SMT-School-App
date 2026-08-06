const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRows } = require('../utils/serialize');

// GET /api/audit-logs?eventType=&search=&limit= — superuser-only. Every
// login/logout, plus a brief record of every write request made anywhere
// in the app (see the global logging middleware in app.js).
router.get('/', auth, authorize(['superuser']), async (req, res) => {
  try {
    const { eventType, search, limit } = req.query;
    let query = db('audit_logs').orderBy('created_at', 'desc');
    if (eventType && eventType !== 'all') query = query.where({ event_type: eventType });
    if (search) {
      const term = `%${search}%`;
      query = query.where((qb) => {
        qb.where('username', 'like', term).orWhere('ip_address', 'like', term).orWhere('summary', 'like', term);
      });
    }
    const rows = await query.limit(Math.min(Number(limit) || 200, 1000));
    return res.json({ logs: serializeRows(rows) });
  } catch (err) {
    console.error('GET /api/audit-logs error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
