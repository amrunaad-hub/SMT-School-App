const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');

const serialize = (row) => serializeRow(row);

const CAMEL_TO_SNAKE = {
  childName: 'child_name', dob: 'dob', currentSchool: 'current_school',
  applyingForGrade: 'applying_for_grade', enquiryType: 'enquiry_type', area: 'area',
  parentName: 'parent_name', parentMobile: 'parent_mobile', parentEmail: 'parent_email',
  source: 'source', status: 'status', followUpNote: 'follow_up_note',
  rejectionReason: 'rejection_reason', assignedTo: 'assigned_to', academicYear: 'academic_year',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

// Auto-generate enquiryCode
const generateEnquiryCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `ENQ-${year}-`;
  const last = await db('admissions').where('enquiry_code', 'like', `${prefix}%`).orderBy('enquiry_code', 'desc').first();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.enquiry_code.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/admissions
router.get('/', auth, async (req, res) => {
  try {
    const { status, grade, search, academicYear } = req.query;
    let query = db('admissions');
    if (status && status !== 'all') query = query.where({ status });
    if (grade && grade !== 'all') query = query.where({ applying_for_grade: Number(grade) });
    if (academicYear) query = query.where({ academic_year: academicYear });
    if (search && search.trim()) {
      const kw = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('child_name LIKE ? COLLATE NOCASE', [kw])
          .orWhereRaw('parent_name LIKE ? COLLATE NOCASE', [kw])
          .orWhereRaw('enquiry_code LIKE ? COLLATE NOCASE', [kw]);
      });
    }

    const rows = await query.orderBy('created_at', 'desc');
    const admissions = serializeRows(rows);
    const total = admissions.length;

    // Compute stats
    let allQuery = db('admissions');
    if (academicYear) allQuery = allQuery.where({ academic_year: academicYear });
    const allRows = await allQuery;
    const all = serializeRows(allRows);

    const stats = {
      totalEnquiries: all.length,
      enquiries: all.filter((a) => a.status === 'Enquiry').length,
      inProcess: all.filter((a) => ['In Process', 'Document Verification'].includes(a.status)).length,
      confirmed: all.filter((a) => a.status === 'Confirmed').length,
      rejected: all.filter((a) => a.status === 'Rejected').length,
      byGrade: {},
    };

    all.forEach((a) => {
      const gk = `Grade ${a.applyingForGrade}`;
      if (!stats.byGrade[gk]) {
        stats.byGrade[gk] = { grade: gk, enquiries: 0, inProcess: 0, confirmed: 0, rejected: 0 };
      }
      stats.byGrade[gk].enquiries++;
      if (['In Process', 'Document Verification'].includes(a.status)) stats.byGrade[gk].inProcess++;
      if (a.status === 'Confirmed') stats.byGrade[gk].confirmed++;
      if (a.status === 'Rejected') stats.byGrade[gk].rejected++;
    });

    stats.byGrade = Object.values(stats.byGrade);

    return res.json({ admissions, total, stats });
  } catch (err) {
    console.error('GET /api/admissions error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admissions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const admission = await db('admissions').where({ id: req.params.id }).first();
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json(serialize(admission));
  } catch (err) {
    console.error('GET /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions
router.post('/', auth, async (req, res) => {
  try {
    const enquiryCode = await generateEnquiryCode();
    const now = new Date().toISOString();
    const [id] = await db('admissions').insert({
      ...bodyToRow(req.body), enquiry_code: enquiryCode, created_at: now, updated_at: now,
    });
    const admission = await db('admissions').where({ id }).first();
    return res.status(201).json(serialize(admission));
  } catch (err) {
    console.error('POST /api/admissions error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate enquiry code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admissions/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('admissions').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Admission record not found.' });
    const admission = await db('admissions').where({ id: req.params.id }).first();
    return res.json(serialize(admission));
  } catch (err) {
    console.error('PUT /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admissions/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('admissions').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json({ message: 'Admission record deleted.' });
  } catch (err) {
    console.error('DELETE /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
