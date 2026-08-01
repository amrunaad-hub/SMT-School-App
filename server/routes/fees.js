const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// GET /api/fees?grade=&division=&status=&search=&page=&limit=
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, status, search, page = 1, limit = 50, academicYear = '2025-26' } = req.query;

    // Build student filter first if grade/division/search provided
    const studentFilter = {};
    if (grade && grade !== 'all') studentFilter.grade = Number(grade);
    if (division && division !== 'all') studentFilter.division = String(division).toLowerCase();
    if (search && search.trim()) {
      const keyword = search.trim();
      studentFilter.$or = [
        { firstName: { $regex: keyword, $options: 'i' } },
        { lastName: { $regex: keyword, $options: 'i' } },
        { studentCode: { $regex: keyword, $options: 'i' } },
      ];
    }

    let feeFilter = { academicYear };

    if (Object.keys(studentFilter).length > 0) {
      const matchingStudents = await Student.find(studentFilter).select('_id').lean();
      const studentIds = matchingStudents.map((s) => s._id);
      feeFilter.student = { $in: studentIds };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let query = Fee.find(feeFilter).populate('student', 'firstName lastName grade division rollNo studentCode isRte');

    // Apply status filter post-populate via aggregation or in-memory
    // For simplicity, fetch all then filter
    const allFees = await Fee.find(feeFilter)
      .populate('student', 'firstName lastName grade division rollNo studentCode isRte')
      .lean({ virtuals: true });

    let filtered = allFees;
    if (status && status !== 'all') {
      filtered = allFees.filter((fee) => {
        if (status === 'rte') return fee.isRte;
        const hasInstallmentStatus = fee.installments.some((inst) => {
          if (status === 'paid') return inst.status === 'Paid';
          if (status === 'delayed') return inst.status === 'Delayed';
          if (status === 'upcoming') return inst.status === 'Upcoming';
          if (status === 'condonence') return inst.status.toLowerCase().includes('condonence');
          return false;
        });
        return hasInstallmentStatus;
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    return res.json({
      fees: paginated,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('GET /api/fees error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fees/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;

    const fees = await Fee.find({ academicYear }).lean({ virtuals: true });

    const totalStudents = fees.length;
    const rteStudents = fees.filter((f) => f.isRte).length;
    const totalPaid = fees.reduce((sum, f) => {
      const paid = (f.installments || []).reduce((s, i) => s + (i.status === 'Paid' ? (i.amount || 0) : 0), 0);
      return sum + paid;
    }, 0);
    const totalPending = fees.reduce((sum, f) => {
      if (f.isRte) return sum;
      const paid = (f.installments || []).reduce((s, i) => s + (i.status === 'Paid' ? (i.amount || 0) : 0), 0);
      return sum + Math.max((f.annualFee || 90000) - paid, 0);
    }, 0);

    // Per-installment breakdown
    const installmentIds = ['april', 'july', 'november'];
    const byInstallment = installmentIds.map((instId) => {
      const records = fees.map((f) => (f.installments || []).find((i) => i.installmentId === instId));
      const paidCount = records.filter((r) => r && r.status === 'Paid').length;
      const paidAmount = records.reduce((s, r) => s + (r && r.status === 'Paid' ? (r.amount || 0) : 0), 0);
      const delayedCount = records.filter((r) => r && r.status === 'Delayed').length;
      const upcomingCount = records.filter((r) => r && r.status === 'Upcoming').length;
      const rteCount = fees.filter((f) => f.isRte).length;
      return { installmentId: instId, paidCount, paidAmount, delayedCount, upcomingCount, rteCount };
    });

    return res.json({
      totalStudents,
      rteStudents,
      totalPaid,
      totalPending,
      byInstallment,
    });
  } catch (err) {
    console.error('GET /api/fees/summary error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fees/student/:studentId
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const fee = await Fee.findOne({ student: req.params.studentId })
      .populate('student', 'firstName lastName grade division rollNo studentCode isRte')
      .lean({ virtuals: true });

    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found for this student.' });
    }
    return res.json(fee);
  } catch (err) {
    console.error('GET /api/fees/student/:studentId error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/fees/student/:studentId/pay
// body: { installmentId, paymentDate, paymentMethod, transactionRef, amount, note }
router.put('/student/:studentId/pay', auth, authorize(['admin']), async (req, res) => {
  try {
    const { installmentId, paymentDate, paymentMethod, transactionRef, amount, note } = req.body;

    if (!installmentId) {
      return res.status(400).json({ message: 'installmentId is required.' });
    }

    const fee = await Fee.findOne({ student: req.params.studentId });
    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found.' });
    }

    const installment = fee.installments.find((i) => i.installmentId === installmentId);
    if (!installment) {
      return res.status(404).json({ message: `Installment '${installmentId}' not found.` });
    }

    installment.status = 'Paid';
    installment.paymentDate = paymentDate || new Date().toISOString().slice(0, 10);
    installment.paymentMethod = paymentMethod || '';
    installment.transactionRef = transactionRef || '';
    if (amount !== undefined) installment.amount = Number(amount);
    if (note) installment.note = note;

    await fee.save();

    const populated = await Fee.findById(fee._id)
      .populate('student', 'firstName lastName grade division rollNo studentCode')
      .lean({ virtuals: true });

    return res.json(populated);
  } catch (err) {
    console.error('PUT /api/fees/student/:studentId/pay error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
