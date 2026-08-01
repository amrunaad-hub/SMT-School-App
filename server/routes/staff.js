const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// GET /api/staff
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, department } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }
    if (department && department !== 'all') {
      filter.department = { $regex: department, $options: 'i' };
    }
    if (search && search.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { displayName: { $regex: keyword, $options: 'i' } },
        { staffCode: { $regex: keyword, $options: 'i' } },
        { role: { $regex: keyword, $options: 'i' } },
        { department: { $regex: keyword, $options: 'i' } },
        { assignedSubjects: { $regex: keyword, $options: 'i' } },
      ];
    }

    const staff = await Staff.find(filter).sort({ category: 1, staffCode: 1 }).lean();
    return res.json({ staff, total: staff.length });
  } catch (err) {
    console.error('GET /api/staff error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/staff/:code
router.get('/:code', auth, async (req, res) => {
  try {
    const staffMember = await Staff.findOne({ staffCode: req.params.code }).lean();
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json(staffMember);
  } catch (err) {
    console.error('GET /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const staffMember = new Staff(req.body);
    await staffMember.save();
    return res.status(201).json(staffMember);
  } catch (err) {
    console.error('POST /api/staff error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Staff code already exists.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/:code
router.put('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const staffMember = await Staff.findOneAndUpdate(
      { staffCode: req.params.code },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json(staffMember);
  } catch (err) {
    console.error('PUT /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:code
router.delete('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const staffMember = await Staff.findOneAndDelete({ staffCode: req.params.code });
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json({ message: 'Staff member deleted.' });
  } catch (err) {
    console.error('DELETE /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
