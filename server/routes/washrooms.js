const express = require('express');
const router = express.Router();
const WashroomLog = require('../models/WashroomLog');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const floors = [1, 2, 3, 4, 5, 6];
const washroomTypes = ['girls', 'boys'];

const defaultChecklist = [
  'Floor and cubicles sanitized',
  'Handwash dispensers checked',
  'Odour control reviewed',
  'Supervisor sign-off captured',
];

/**
 * Format a WashroomLog document into the shape the component expects.
 */
const formatRecord = (log) => {
  if (!log) return null;
  const floor = log.floor;
  const type = log.type;
  return {
    id: `floor-${floor}-${type}`,
    floor,
    type,
    label: `Floor ${floor} ${type === 'girls' ? 'Girls Washroom' : 'Boys Washroom'}`,
    status: log.status || 'Good',
    score: log.score || 80,
    cleanedBy: log.cleanedBy || '',
    cleaningType: log.cleaningType || 'Mopping',
    lastCleanedAt: log.cleanedAt
      ? new Date(log.cleanedAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : '',
    lastAuditAt: log.auditedAt
      ? new Date(log.auditedAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : '',
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

const formatHistoryEntry = (log) => ({
  cleanedAt: log.cleanedAt
    ? new Date(log.cleanedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '',
  cleanedBy: log.cleanedBy || '',
  cleaningType: log.cleaningType || 'Mopping',
  auditedAt: log.auditedAt
    ? new Date(log.auditedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '',
  auditedBy: log.auditedBy || '',
  score: log.score || 80,
  issue: log.issue || 'No issue reported',
  comments: log.comments || '',
});

// GET /api/washrooms/latest — latest log per (floor, type)
router.get('/latest', auth, async (req, res) => {
  try {
    const records = [];

    for (const floor of floors) {
      for (const type of washroomTypes) {
        const log = await WashroomLog.findOne({ floor, type })
          .sort({ cleanedAt: -1 })
          .lean();
        if (log) {
          records.push(formatRecord(log));
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

    const logs = await WashroomLog.find({ floor, type })
      .sort({ cleanedAt: -1 })
      .limit(limit)
      .lean();

    const latestLog = logs[0];
    const record = latestLog ? formatRecord(latestLog) : null;
    const cleaningHistory = logs.map(formatHistoryEntry);

    return res.json({
      record,
      cleaningHistory,
      floor,
      type,
      total: logs.length,
    });
  } catch (err) {
    console.error('GET /api/washrooms/:floor/:type/history error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/washrooms/log (admin)
router.post('/log', auth, authorize(['admin']), async (req, res) => {
  try {
    const log = new WashroomLog(req.body);
    await log.save();
    return res.status(201).json(log);
  } catch (err) {
    console.error('POST /api/washrooms/log error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/washrooms/log/:id (admin)
router.put('/log/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const log = await WashroomLog.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!log) return res.status(404).json({ message: 'Washroom log not found.' });
    return res.json(log);
  } catch (err) {
    console.error('PUT /api/washrooms/log/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
