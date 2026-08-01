const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');

const JSON_FIELDS = ['assigned_subjects', 'compensation'];
const BOOL_FIELDS = ['is_maharashtrian', 'is_brahmin'];
const serialize = (row, opts = {}) => serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, ...opts });

const CAMEL_TO_SNAKE = {
  staffCode: 'staff_code', displayName: 'display_name', firstName: 'first_name', lastName: 'last_name',
  gender: 'gender', category: 'category', department: 'department', role: 'role',
  qualification: 'qualification', joiningDate: 'joining_date', phone: 'phone', email: 'email',
  photoUrl: 'photo_url', isMaharashtrian: 'is_maharashtrian', isBrahmin: 'is_brahmin',
  experienceYearsPrior: 'experience_years_prior', experienceYearsCurrentSchool: 'experience_years_current_school',
  classesTakenTotal: 'classes_taken_total', classesTakenYtd: 'classes_taken_ytd', status: 'status',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    if (key === 'assignedSubjects') { row.assigned_subjects = JSON.stringify(value || []); return; }
    if (key === 'compensation') { row.compensation = JSON.stringify(value || {}); return; }
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = (key === 'isMaharashtrian' || key === 'isBrahmin') ? (value ? 1 : 0) : value;
  });
  return row;
}

// GET /api/staff
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, department } = req.query;
    let query = db('staff');

    if (category && category !== 'all') query = query.where({ category });
    if (department && department !== 'all') query = query.whereRaw('department LIKE ? COLLATE NOCASE', [`%${department}%`]);
    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('display_name LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('staff_code LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('role LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('department LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('assigned_subjects LIKE ? COLLATE NOCASE', [keyword]);
      });
    }

    const rows = await query.orderBy([{ column: 'category' }, { column: 'staff_code' }]);
    const staff = serializeRows(rows, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS });
    return res.json({ staff, total: staff.length });
  } catch (err) {
    console.error('GET /api/staff error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/staff/:code
router.get('/:code', auth, async (req, res) => {
  try {
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json(serialize(staffMember));
  } catch (err) {
    console.error('GET /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const row = { ...bodyToRow(req.body), created_at: now, updated_at: now };
    const [id] = await db('staff').insert(row);
    const staffMember = await db('staff').where({ id }).first();
    return res.status(201).json(serialize(staffMember));
  } catch (err) {
    console.error('POST /api/staff error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Staff code already exists.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/:code
router.put('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('staff').where({ staff_code: req.params.code }).update(updates);
    if (!count) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    return res.json(serialize(staffMember));
  } catch (err) {
    console.error('PUT /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:code
router.delete('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('staff').where({ staff_code: req.params.code }).delete();
    if (!count) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json({ message: 'Staff member deleted.' });
  } catch (err) {
    console.error('DELETE /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
