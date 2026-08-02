const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { serializeRow, serializeRows } = require('../utils/serialize');

// GET /api/notifications — current user's recent notifications, unread first.
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db('notifications')
      .where({ user_id: req.user.id })
      .orderBy([{ column: 'is_read', order: 'asc' }, { column: 'created_at', order: 'desc' }])
      .limit(50);
    const [{ count: unread }] = await db('notifications').where({ user_id: req.user.id, is_read: false }).count({ count: '*' });
    return res.json({ notifications: serializeRows(rows, { boolFields: ['is_read'] }), unreadCount: Number(unread) });
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const count = await db('notifications').where({ id: req.params.id, user_id: req.user.id }).update({ is_read: true });
    if (!count) return res.status(404).json({ message: 'Notification not found.' });
    const row = await db('notifications').where({ id: req.params.id }).first();
    return res.json(serializeRow(row, { boolFields: ['is_read'] }));
  } catch (err) {
    console.error('POST /api/notifications/:id/read error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
