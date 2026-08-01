const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Auto-generate enquiryCode
const generateEnquiryCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `ENQ-${year}-`;
  const last = await Admission.findOne({ enquiryCode: { $regex: `^${prefix}` } })
    .sort({ enquiryCode: -1 })
    .lean();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.enquiryCode.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/admissions
router.get('/', auth, async (req, res) => {
  try {
    const { status, grade, search, academicYear } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (grade && grade !== 'all') filter.applyingForGrade = Number(grade);
    if (academicYear) filter.academicYear = academicYear;
    if (search && search.trim()) {
      const kw = search.trim();
      filter.$or = [
        { childName: { $regex: kw, $options: 'i' } },
        { parentName: { $regex: kw, $options: 'i' } },
        { enquiryCode: { $regex: kw, $options: 'i' } },
      ];
    }

    const admissions = await Admission.find(filter).sort({ createdAt: -1 }).lean();
    const total = admissions.length;

    // Compute stats
    const all = await Admission.find(
      academicYear ? { academicYear } : {}
    ).lean();

    const stats = {
      totalEnquiries: all.length,
      enquiries: all.filter((a) => a.status === 'Enquiry').length,
      inProcess:
        all.filter((a) => ['In Process', 'Document Verification'].includes(a.status)).length,
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
    const admission = await Admission.findById(req.params.id).lean();
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json(admission);
  } catch (err) {
    console.error('GET /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions
router.post('/', auth, async (req, res) => {
  try {
    const enquiryCode = await generateEnquiryCode();
    const admission = new Admission({ ...req.body, enquiryCode });
    await admission.save();
    return res.status(201).json(admission);
  } catch (err) {
    console.error('POST /api/admissions error:', err.message);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate enquiry code.' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admissions/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json(admission);
  } catch (err) {
    console.error('PUT /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admissions/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json({ message: 'Admission record deleted.' });
  } catch (err) {
    console.error('DELETE /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
