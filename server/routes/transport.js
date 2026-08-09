const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');

const JSON_FIELDS = ['stops', 'assigned_students'];
const serialize = (row) => serializeRow(row, { jsonFields: JSON_FIELDS });

const CAMEL_TO_SNAKE = {
  routeName: 'route_name', vehicleNumber: 'vehicle_number', driverName: 'driver_name',
  driverPhone: 'driver_phone', capacity: 'capacity', currentOccupancy: 'current_occupancy',
  morningDepartureTime: 'morning_departure_time', eveningDepartureTime: 'evening_departure_time',
  status: 'status',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    if (key === 'stops') { row.stops = JSON.stringify(value || []); return; }
    if (key === 'assignedStudents') { row.assigned_students = JSON.stringify(value || []); return; }
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

// GET /api/transport (list view omits assignedStudents, matching the old .select('-assignedStudents'))
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db('transport_routes').orderBy('route_code', 'asc');
    const routes = serializeRows(rows, { jsonFields: ['stops'] }).map((r) => {
      const { assignedStudents, ...rest } = r;
      return rest;
    });
    return res.json({ routes, total: routes.length });
  } catch (err) {
    console.error('GET /api/transport error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/transport/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await db('transport_routes').where({ id: req.params.id }).first();
    if (!route) return res.status(404).json({ message: 'Transport route not found.' });

    const serialized = serialize(route);
    const studentIds = serialized.assignedStudents || [];
    const students = studentIds.length
      ? await db('students').whereIn('id', studentIds).select('id', 'first_name', 'last_name', 'grade', 'division', 'student_code', 'roll_no')
      : [];
    serialized.assignedStudents = students.map((s) => ({
      _id: String(s.id),
      firstName: s.first_name, lastName: s.last_name, grade: s.grade,
      division: s.division, studentCode: s.student_code, rollNo: s.roll_no,
    }));

    return res.json(serialized);
  } catch (err) {
    console.error('GET /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/transport (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const [{ id }] = await db('transport_routes').insert({ ...bodyToRow(req.body), created_at: now, updated_at: now }).returning('id');
    const route = await db('transport_routes').where({ id }).first();
    return res.status(201).json(serialize(route));
  } catch (err) {
    console.error('POST /api/transport error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate route code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/transport/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('transport_routes').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Transport route not found.' });
    const route = await db('transport_routes').where({ id: req.params.id }).first();
    return res.json(serialize(route));
  } catch (err) {
    console.error('PUT /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/transport/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('transport_routes').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Transport route not found.' });
    return res.json({ message: 'Transport route deleted.' });
  } catch (err) {
    console.error('DELETE /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
