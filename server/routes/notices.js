const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { noticeAppliesToUser, normalizeAudience, resolveReachCount, AUDIENCE_DEFAULT } = require('../utils/noticeAudience');
const { sendToSubscriptions } = require('../utils/webPush');
const { getRepresentativeScope, scopeToAllowedGradeDivisions, audienceWithinScope } = require('../utils/representatives');

const JSON_FIELDS = ['target_audience'];
const BOOL_FIELDS = ['is_active'];
const serialize = (row) => {
  const out = serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, jsonDefault: AUDIENCE_DEFAULT });
  out.targetAudience = normalizeAudience(out.targetAudience);
  return out;
};

// Human-readable sender label for a notice — "Admin"/"Principal" for those
// roles (no personal name on file for them), the teacher's actual name from
// their staff record (falling back to their username if for some reason
// they have no linked staff row), or a PTA/CR rep's guardian name with their
// designation tacked on so recipients know it isn't an official school notice.
const resolveSenderLabel = async (user, repScope) => {
  if (repScope) {
    const guardian = await db('guardians').where({ user_id: user.id }).first();
    const name = guardian?.full_name || user.username;
    return repScope.isPta ? `${name} (PTA, Grade ${repScope.ptaGrade})` : `${name} (Class Representative)`;
  }
  if (user.role === 'teacher') {
    const staff = await db('staff').where({ user_id: user.id }).first();
    if (staff) return staff.display_name;
  }
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'principal') return 'Principal';
  return user.username;
};

// Parents hold no role beyond 'parent' even when they're a PTA/class rep
// (see server/utils/representatives.js) — so unlike the rest of this file's
// role checks, letting them write notices needs an async designation lookup
// and can't be the generic role-only `authorize` middleware. Stashes the
// resolved scope on req.repScope for the audience-clamping below.
const authorizeNoticeWriter = async (req, res, next) => {
  if (['admin', 'principal', 'teacher', 'superuser'].includes(req.user.role)) return next();
  if (req.user.role === 'parent') {
    const scope = await getRepresentativeScope(req.user.id);
    if (scope.isPta || scope.classRepScopes.length > 0) {
      req.repScope = scope;
      return next();
    }
  }
  return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
};

// A rep-authored notice's audience may not reach outside their own
// grade/division(s) — gradeSelections are checked synchronously,
// studentIds need a DB lookup since we have to know each student's
// grade/division to compare against the rep's scope.
const validateRepAudience = async (repScope, audience) => {
  if (!audienceWithinScope(repScope, audience)) {
    return 'You can only send to your own grade/division.';
  }
  const studentIds = audience.studentIds || [];
  if (studentIds.length > 0) {
    const allowed = scopeToAllowedGradeDivisions(repScope);
    const students = await db('students').whereIn('id', studentIds).select('id', 'grade', 'division');
    const inScope = (s) => {
      const a = allowed.find((x) => x.grade === s.grade);
      return a && (a.allDivisions || a.divisions.includes(s.division));
    };
    if (students.length !== studentIds.length || !students.every(inScope)) {
      return 'You can only message parents within your own grade/division.';
    }
  }
  return null;
};

// Auto-generate noticeCode
const generateNoticeCode = async () => {
  const last = await db('notices').where('notice_code', 'like', 'NTC-%').orderBy('notice_code', 'desc').first();
  if (!last) return 'NTC-001';
  const num = parseInt(last.notice_code.slice(4), 10) || 0;
  return `NTC-${String(num + 1).padStart(3, '0')}`;
};

// Multiple attachments per notice live in the generic `documents` table
// (owner_type='notice'), same pattern as leave_request/period_note — batches
// one query instead of one per notice.
async function attachDocuments(notices) {
  if (!notices.length) return notices;
  const docs = await db('documents').where({ owner_type: 'notice' }).whereIn('owner_id', notices.map((n) => n.id));
  const byNotice = {};
  docs.forEach((d) => {
    (byNotice[d.owner_id] ||= []).push({ id: d.id, docType: d.doc_type, fileUrl: d.file_url, originalFilename: d.original_filename });
  });
  notices.forEach((n) => { n.attachments = byNotice[n.id] || []; });
  return notices;
}

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
    await attachDocuments(notices);

    return res.json({ notices, total: notices.length });
  } catch (err) {
    console.error('GET /api/notices error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notices/mine — role-and-audience-resolved feed for the logged-in
// user (parents get only notices actually targeted at them or their
// children; other roles get role/broadcast matches). Includes deactivated
// and expired notices too — deletion is the only thing that should make a
// notice disappear from a recipient's feed, same policy as the admin
// Communication screen's Active/Archived split (nothing is ever hidden
// there either, just categorized).
router.get('/mine', auth, async (req, res) => {
  try {
    const rows = await db('notices').orderBy('published_at', 'desc');
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
    await attachDocuments(applicable);

    return res.json({ notices: applicable, total: applicable.length });
  } catch (err) {
    console.error('GET /api/notices/mine error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notices/sent — notices the logged-in user personally authored.
// Mainly for PTA/class reps (parents don't otherwise have any "manage my
// notices" view) — staff already see everything via GET /, scoped by
// canModifyNotice client-side.
router.get('/sent', auth, async (req, res) => {
  try {
    const rows = await db('notices').where({ created_by_user_id: req.user.id }).orderBy('published_at', 'desc');
    const notices = await Promise.all(rows.map(async (row) => {
      const notice = serialize(row);
      notice.reachCount = await resolveReachCount(db, notice.targetAudience);
      return notice;
    }));
    await attachDocuments(notices);
    return res.json({ notices, total: notices.length });
  } catch (err) {
    console.error('GET /api/notices/sent error:', err.message);
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

// Push a "new notice" alert to every subscribed parent/teacher whose
// audience actually matches — reuses the same per-user matching the
// /mine feed uses, just scoped to the (usually small) set of users who
// opted into notifications rather than every user. Never awaited by the
// caller: publishing shouldn't block on push delivery.
const HTML_ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const stripHtml = (html) => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => HTML_ENTITIES[m])
  .replace(/\s+/g, ' ')
  .trim();

async function notifySubscribers(notice) {
  const subs = await db('push_subscriptions')
    .join('users', 'users.id', 'push_subscriptions.user_id')
    .whereIn('users.role', ['parent', 'teacher'])
    .select('push_subscriptions.id', 'push_subscriptions.user_id', 'push_subscriptions.endpoint', 'push_subscriptions.p256dh', 'push_subscriptions.auth', 'users.role');

  if (!subs.length) return;

  const matched = [];
  for (const sub of subs) {
    const applies = await noticeAppliesToUser(db, notice, { id: sub.user_id, role: sub.role });
    if (applies) matched.push(sub);
  }
  if (!matched.length) return;

  const snippet = stripHtml(notice.body).slice(0, 120);
  const body = notice.issuedBy ? `${notice.issuedBy}: ${snippet}` : snippet;
  // Parents view notices inside the Parents SPA's own tab state (there's no
  // dedicated route), while /communication is staff-only (admin/principal/
  // teacher) and 404s the route guard for a parent — that mismatch is why
  // tapping a notification previously dropped parents on the home page.
  const byRole = { parent: [], teacher: [] };
  matched.forEach((sub) => byRole[sub.role]?.push(sub));

  await Promise.all([
    sendToSubscriptions(db, byRole.parent, { title: notice.title, body, url: `/parents?module=circular&noticeId=${notice.id}` }),
    sendToSubscriptions(db, byRole.teacher, { title: notice.title, body, url: `/communication?noticeId=${notice.id}` }),
  ]);
}

// POST /api/notices (admin, principal, teacher, or a parent who is a PTA/class rep)
router.post('/', auth, authorizeNoticeWriter, async (req, res) => {
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

    const audience = targetAudience || AUDIENCE_DEFAULT;
    if (req.repScope) {
      const violation = await validateRepAudience(req.repScope, audience);
      if (violation) return res.status(403).json({ message: violation });
    }

    const [id] = await db('notices').insert({
      notice_code: noticeCode,
      title,
      body,
      category: category || 'General',
      target_audience: JSON.stringify(audience),
      issued_by: issuedBy || await resolveSenderLabel(req.user, req.repScope),
      created_by_user_id: req.user.id,
      source: req.repScope ? (req.repScope.isPta ? 'pta' : 'class_rep') : 'school',
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
    const serializedNotice = serialize(notice);
    if (notice.is_active) notifySubscribers(serializedNotice).catch((err) => console.error('[push] notifySubscribers failed:', err.message));
    return res.status(201).json(serializedNotice);
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

// Teachers get the same edit/deactivate/delete control over every notice as
// admin/principal — not just ones they created themselves. A PTA/class rep
// (repScope set) only gets that control over notices they themselves sent.
const canModifyNotice = (notice, user, repScope) => {
  if (['admin', 'principal', 'superuser', 'teacher'].includes(user.role)) return true;
  if (repScope) return notice.created_by_user_id === user.id;
  return false;
};

// PUT /api/notices/:id (admin, principal, teacher, or the rep who sent it)
router.put('/:id', auth, authorizeNoticeWriter, async (req, res) => {
  try {
    const existing = await db('notices').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ message: 'Notice not found.' });
    if (!canModifyNotice(existing, req.user, req.repScope)) {
      return res.status(403).json({ message: 'You can only edit notices you created.' });
    }
    if (req.repScope && req.body.targetAudience) {
      const violation = await validateRepAudience(req.repScope, req.body.targetAudience);
      if (violation) return res.status(403).json({ message: violation });
    }

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
    const serializedNotice = serialize(notice);
    if (notice.is_active) {
      notifySubscribers({ ...serializedNotice, title: `Updated: ${serializedNotice.title}` })
        .catch((err) => console.error('[push] notifySubscribers failed:', err.message));
    }
    return res.json(serializedNotice);
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

// DELETE /api/notices/:id (admin, principal, teacher, or the rep who sent it)
router.delete('/:id', auth, authorizeNoticeWriter, async (req, res) => {
  try {
    const existing = await db('notices').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ message: 'Notice not found.' });
    if (!canModifyNotice(existing, req.user, req.repScope)) {
      return res.status(403).json({ message: 'You can only delete notices you created.' });
    }

    const count = await db('notices').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Notice not found.' });
    return res.json({ message: 'Notice deleted.' });
  } catch (err) {
    console.error('DELETE /api/notices/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
