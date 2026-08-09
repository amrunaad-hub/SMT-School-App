const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow } = require('../utils/serialize');

const floors = [1, 2, 3, 4, 5, 6];
const washroomTypes = ['girls', 'boys'];

const defaultChecklist = [
  'Floor and cubicles sanitized',
  'Handwash dispensers checked',
  'Odour control reviewed',
  'Supervisor sign-off captured',
];

function parseLog(row) {
  return serializeRow(row, { jsonFields: ['checklist'], jsonDefault: [] });
}

const fmtDateTime = (val) => (val
  ? new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '');

/**
 * Format a washroom log row into the shape the component expects.
 */
const formatRecord = (row) => {
  if (!row) return null;
  const log = parseLog(row);
  const { floor, type } = log;
  return {
    id: `floor-${floor}-${type}`,
    floor,
    type,
    label: `Floor ${floor} ${type === 'girls' ? 'Girls Washroom' : 'Boys Washroom'}`,
    status: log.status || 'Good',
    score: log.score || 80,
    cleanedBy: log.cleanedBy || '',
    cleaningType: log.cleaningType || 'Mopping',
    lastCleanedAt: fmtDateTime(log.cleanedAt) || (log.cleanedAt ? '' : ''),
    lastAuditAt: fmtDateTime(log.auditedAt),
    supervisor: log.auditedBy || '',
    supplyStatus: log.supplyStatus || 'In stock',
    issue: log.issue || 'No issue reported',
    comments: log.comments || '',
    checklist: log.checklist && log.checklist.length > 0
      ? log.checklist.map((c) => (typeof c === 'string' ? c : c.item))
      : defaultChecklist,
    _id: log._id,
  };
};

const formatHistoryEntry = (row) => {
  const log = parseLog(row);
  return {
    cleanedAt: fmtDateTime(log.cleanedAt),
    cleanedBy: log.cleanedBy || '',
    cleaningType: log.cleaningType || 'Mopping',
    auditedAt: fmtDateTime(log.auditedAt),
    auditedBy: log.auditedBy || '',
    score: log.score || 80,
    issue: log.issue || 'No issue reported',
    comments: log.comments || '',
  };
};

// GET /api/washrooms/latest — latest log per (floor, type)
router.get('/latest', auth, async (req, res) => {
  try {
    const records = [];

    for (const floor of floors) {
      for (const type of washroomTypes) {
        const row = await db('washroom_logs').where({ floor, type }).orderBy('cleaned_at', 'desc').first();
        if (row) {
          records.push(formatRecord(row));
        } else {
          // Push a placeholder so component always has all 12
          records.push({
            id: `floor-${floor}-${type}`,
            floor,
            type,
            label: `Floor ${floor} ${type === 'girls' ? 'Girls Washroom' : 'Boys Washroom'}`,
            status: 'Good',
            score: 80,
            cleanedBy: '',
            cleaningType: 'Mopping',
            lastCleanedAt: 'No data',
            lastAuditAt: 'No data',
            supervisor: '',
            supplyStatus: 'In stock',
            issue: 'No issue reported',
            comments: '',
            checklist: defaultChecklist,
          });
        }
      }
    }

    return res.json({ records, total: records.length });
  } catch (err) {
    console.error('GET /api/washrooms/latest error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/washrooms/:floor/:type/history
router.get('/:floor/:type/history', auth, async (req, res) => {
  try {
    const floor = Number(req.params.floor);
    const type = req.params.type;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));

    if (!floors.includes(floor) || !washroomTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid floor or type.' });
    }

    const rows = await db('washroom_logs').where({ floor, type }).orderBy('cleaned_at', 'desc').limit(limit);

    const record = rows[0] ? formatRecord(rows[0]) : null;
    const cleaningHistory = rows.map(formatHistoryEntry);

    return res.json({ record, cleaningHistory, floor, type, total: rows.length });
  } catch (err) {
    console.error('GET /api/washrooms/:floor/:type/history error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

const CAMEL_TO_SNAKE = {
  location: 'location', floor: 'floor', type: 'type', cleanedAt: 'cleaned_at', cleanedBy: 'cleaned_by',
  cleaningType: 'cleaning_type', auditedAt: 'audited_at', auditedBy: 'audited_by', score: 'score',
  status: 'status', supplyStatus: 'supply_status', issue: 'issue', comments: 'comments',
  beforePhotoUrl: 'before_photo_url', afterPhotoUrl: 'after_photo_url',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    if (key === 'checklist') { row.checklist = JSON.stringify(value || []); return; }
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

// POST /api/washrooms/log (admin)
router.post('/log', auth, authorize(['admin']), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const [{ id }] = await db('washroom_logs').insert({ ...bodyToRow(req.body), created_at: now, updated_at: now }).returning('id');
    const log = await db('washroom_logs').where({ id }).first();
    return res.status(201).json(parseLog(log));
  } catch (err) {
    console.error('POST /api/washrooms/log error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/washrooms/log/:id (admin)
router.put('/log/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('washroom_logs').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Washroom log not found.' });
    const log = await db('washroom_logs').where({ id: req.params.id }).first();
    return res.json(parseLog(log));
  } catch (err) {
    console.error('PUT /api/washrooms/log/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
