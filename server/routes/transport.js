const express = require('express');
const router = express.Router();
const TransportRoute = require('../models/TransportRoute');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// GET /api/transport
router.get('/', auth, async (req, res) => {
  try {
    const routes = await TransportRoute.find()
      .select('-assignedStudents')
      .sort({ routeCode: 1 })
      .lean();
    return res.json({ routes, total: routes.length });
  } catch (err) {
    console.error('GET /api/transport error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/transport/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await TransportRoute.findById(req.params.id)
      .populate('assignedStudents', 'firstName lastName grade division studentCode rollNo')
      .lean();
    if (!route) return res.status(404).json({ message: 'Transport route not found.' });
    return res.json(route);
  } catch (err) {
    console.error('GET /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/transport (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const route = new TransportRoute(req.body);
    await route.save();
    return res.status(201).json(route);
  } catch (err) {
    console.error('POST /api/transport error:', err.message);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate route code.' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/transport/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const route = await TransportRoute.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!route) return res.status(404).json({ message: 'Transport route not found.' });
    return res.json(route);
  } catch (err) {
    console.error('PUT /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/transport/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const route = await TransportRoute.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: 'Transport route not found.' });
    return res.json({ message: 'Transport route deleted.' });
  } catch (err) {
    console.error('DELETE /api/transport/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
