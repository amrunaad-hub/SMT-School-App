const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { noticeAppliesToUser, normalizeAudience, resolveReachCount, AUDIENCE_DEFAULT } = require('../utils/noticeAudience');

const JSON_FIELDS = ['target_audience'];
const BOOL_FIELDS = ['is_active'];
const serialize = (row) => {
  const out = serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, jsonDefault: AUDIENCE_DEFAULT });
  out.targetAudience = normalizeAudience(out.targetAudience);
  return out;
};

// Auto-generate noticeCode
const generateNoticeCode = async () => {
  const last = await db('notices').where('notice_code', 'like', 'NTC-%').orderBy('notice_code', 'desc').first();
  if (!last) return 'NTC-001';
  const num = parseInt(last.notice_code.slice(4), 10) || 0;
  return `NTC-${String(num + 1).padStart(3, '0')}`;
};

// GET /api/notices — admin/principal-facing: everything, regardless of
// audience or expiry (the frontend buckets Active vs Archived itself; a
// notice is never hidden from the API just because it expired).
router.get('/', auth, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    let query = db('notices');
    if (category && category !== 'all') query = query.where({ category });
    if (isActive !== undefined && isActive !== '') query = query.where({ is_active: isActive === 'true' ? 1 : 0 });

    const rows = await query.orderBy('published_at', 'desc');
    const notices = await Promise.all(rows.map(async (row) => {
      const notice = serialize(row);
      const [reachCount, openRow] = await Promise.all([
        resolveReachCount(db, notice.targetAudience),
        db('notice_reads').where({ notice_id: notice.id }).countDistinct({ count: 'user_id' }).first(),
      ]);
      notice.reachCount = reachCount;
      notice.openCount = Number(openRow?.count || 0);
      return notice;
    }));

    return res.json({ notices, total: notices.length });
  } catch (err) {
    console.error('GET /api/notices error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notices/mine — role-and-audience-resolved feed for the logged-in
// user (parents get only notices actually targeted at them or their
// children; other roles get role/broadcast matches). Still includes expired
// ones so the caller can show an Archived section if it wants.
router.get('/mine', auth, async (req, res) => {
  try {
    const rows = await db('notices').where({ is_active: true }).orderBy('published_at', 'desc');
    const notices = rows.map(serialize);
    const applicable = [];
    for (const notice of notices) {
      if (await noticeAppliesToUser(db, notice, req.user)) applicable.push(notice);
    }

    const readIds = new Set();
    if (applicable.length) {
      const readRows = await db('notice_reads')
        .where({ user_id: req.user.id })
        .whereIn('notice_id', applicable.map((n) => n.id));
      readRows.forEach((r) => readIds.add(r.notice_id));
    }
    applicable.forEach((notice) => { notice.isRead = readIds.has(notice.id); });

    return res.json({ notices: applicable, total: applicable.length });
  } catch (err) {
    console.error('GET /api/notices/mine error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notices/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const notice = await db('notices').where({ id: req.params.id }).first();
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    return res.json(serialize(notice));
  } catch (err) {
    console.error('GET /api/notices/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notices (admin, principal)
router.post('/', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const noticeCode = await generateNoticeCode();
    const now = new Date().toISOString();
    const {
      title, body, category, targetAudience, issuedBy,
      publishedAt, eventDate, expiresAt, attachmentUrl, priority, isActive,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required.' });
    }

    const [id] = await db('notices').insert({
      notice_code: noticeCode,
      title,
      body,
      category: category || 'General',
      target_audience: JSON.stringify(targetAudience || AUDIENCE_DEFAULT),
      issued_by: issuedBy || null,
      published_at: publishedAt || now,
      event_date: eventDate || null,
      expires_at: expiresAt || null,
      attachment_url: attachmentUrl || null,
      priority: priority || 'Normal',
      is_active: isActive === undefined ? 1 : (isActive ? 1 : 0),
      created_at: now,
      updated_at: now,
    });

    const notice = await db('notices').where({ id }).first();
    return res.status(201).json(serialize(notice));
  } catch (err) {
    console.error('POST /api/notices error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate notice code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

const CAMEL_TO_SNAKE = {
  title: 'title', body: 'body', category: 'category', issuedBy: 'issued_by',
  publishedAt: 'published_at', eventDate: 'event_date', expiresAt: 'expires_at',
  attachmentUrl: 'attachment_url', priority: 'priority', isActive: 'is_active',
};

// PUT /api/notices/:id (admin, principal)
router.put('/:id', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const updates = {};
    Object.entries(req.body).forEach(([key, value]) => {
      if (key === 'targetAudience') { updates.target_audience = JSON.stringify(value); return; }
      const column = CAMEL_TO_SNAKE[key];
      if (column) updates[column] = key === 'isActive' ? (value ? 1 : 0) : value;
    });
    updates.updated_at = new Date().toISOString();

    const count = await db('notices').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Notice not found.' });

    // Editing invalidates prior reads — recipients who already opened this
    // notice should see it as unread again since the content they read is stale.
    await db('notice_reads').where({ notice_id: req.params.id }).del();

    const notice = await db('notices').where({ id: req.params.id }).first();
    return res.json(serialize(notice));
  } catch (err) {
    console.error('PUT /api/notices/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notices/:id/read (any authenticated role) — records that this
// user actually viewed the notice's content (not just fetched the list), for
// the admin-facing reach-vs-open comparison. Idempotent: re-opening the same
// notice doesn't inflate the count.
router.post('/:id/read', auth, async (req, res) => {
  try {
    await db('notice_reads')
      .insert({ notice_id: req.params.id, user_id: req.user.id, opened_at: new Date().toISOString() })
      .onConflict(['notice_id', 'user_id']).ignore();
    return res.json({ message: 'Recorded.' });
  } catch (err) {
    console.error('POST /api/notices/:id/read error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notices/:id (admin, principal)
router.delete('/:id', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const count = await db('notices').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Notice not found.' });
    return res.json({ message: 'Notice deleted.' });
  } catch (err) {
    console.error('DELETE /api/notices/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
