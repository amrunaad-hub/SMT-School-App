const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow } = require('../utils/serialize');

const JSON_FIELDS = ['installments'];
const BOOL_FIELDS = ['is_rte'];

// Mirrors the old Mongoose virtuals (paidAmount/pendingAmount), computed from the
// parsed installments array rather than stored, same as before.
function withVirtuals(row) {
  const fee = serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS });
  const paidAmount = (fee.installments || []).reduce((sum, i) => sum + (i.status === 'Paid' ? (i.amount || 0) : 0), 0);
  const pendingAmount = fee.isRte ? 0 : Math.max((fee.annualFee || 90000) - paidAmount, 0);
  return { ...fee, paidAmount, pendingAmount };
}

function withStudent(row) {
  const fee = withVirtuals(row);
  fee.student = {
    _id: String(row.student_id),
    firstName: row.s_first_name,
    lastName: row.s_last_name,
    grade: row.s_grade,
    division: row.s_division,
    rollNo: row.s_roll_no,
    studentCode: row.s_student_code,
    isRte: !!row.s_is_rte,
  };
  return fee;
}

const STUDENT_JOIN_COLUMNS = [
  'fees.*',
  'students.first_name as s_first_name', 'students.last_name as s_last_name',
  'students.grade as s_grade', 'students.division as s_division',
  'students.roll_no as s_roll_no', 'students.student_code as s_student_code',
  'students.is_rte as s_is_rte',
];

// GET /api/fees?grade=&division=&status=&search=&page=&limit=
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, status, search, page = 1, limit = 50, academicYear = '2025-26' } = req.query;

    let query = db('fees').join('students', 'students.id', 'fees.student_id')
      .select(STUDENT_JOIN_COLUMNS)
      .where('fees.academic_year', academicYear);

    if (grade && grade !== 'all') query = query.where('students.grade', Number(grade));
    if (division && division !== 'all') query = query.where('students.division', String(division).toLowerCase());
    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('students.first_name LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('students.last_name LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('students.student_code LIKE ? COLLATE NOCASE', [keyword]);
      });
    }

    const rows = await query;
    let fees = rows.map(withStudent);

    if (status && status !== 'all') {
      fees = fees.filter((fee) => {
        if (status === 'rte') return fee.isRte;
        return (fee.installments || []).some((inst) => {
          if (status === 'paid') return inst.status === 'Paid';
          if (status === 'delayed') return inst.status === 'Delayed';
          if (status === 'upcoming') return inst.status === 'Upcoming';
          if (status === 'condonence') return inst.status.toLowerCase().includes('condonence');
          return false;
        });
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;
    const total = fees.length;
    const paginated = fees.slice(offset, offset + limitNum);

    return res.json({ fees: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /api/fees error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fees/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const rows = await db('fees').where({ academic_year: academicYear });
    const fees = rows.map((r) => serializeRow(r, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS }));

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

    return res.json({ totalStudents, rteStudents, totalPaid, totalPending, byInstallment });
  } catch (err) {
    console.error('GET /api/fees/summary error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fees/student/:studentId
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const row = await db('fees').join('students', 'students.id', 'fees.student_id')
      .select(STUDENT_JOIN_COLUMNS)
      .where('fees.student_id', req.params.studentId).first();

    if (!row) {
      return res.status(404).json({ message: 'Fee record not found for this student.' });
    }
    return res.json(withStudent(row));
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

    const feeRow = await db('fees').where({ student_id: req.params.studentId }).first();
    if (!feeRow) {
      return res.status(404).json({ message: 'Fee record not found.' });
    }

    const installments = JSON.parse(feeRow.installments || '[]');
    const installment = installments.find((i) => i.installmentId === installmentId);
    if (!installment) {
      return res.status(404).json({ message: `Installment '${installmentId}' not found.` });
    }

    installment.status = 'Paid';
    installment.paymentDate = paymentDate || new Date().toISOString().slice(0, 10);
    installment.paymentMethod = paymentMethod || '';
    installment.transactionRef = transactionRef || '';
    if (amount !== undefined) installment.amount = Number(amount);
    if (note) installment.note = note;

    await db('fees').where({ id: feeRow.id }).update({
      installments: JSON.stringify(installments),
      updated_at: new Date().toISOString(),
    });

    const row = await db('fees').join('students', 'students.id', 'fees.student_id')
      .select(STUDENT_JOIN_COLUMNS)
      .where('fees.id', feeRow.id).first();
    return res.json(withStudent(row));
  } catch (err) {
    console.error('PUT /api/fees/student/:studentId/pay error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
