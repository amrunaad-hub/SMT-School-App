const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getRepresentativeScope, assignPta, removePta, assignClassRep, removeClassRep } = require('../utils/representatives');

const DIVISIONS = ['alpha', 'beta', 'gamma'];

const guardianLabel = (g) => ({ guardianId: g.id, name: g.full_name, mobile: g.mobile });

// GET /api/representatives/me — the logged-in parent's own PTA/CR scope.
// Used by the client to decide whether to show the compose tab at all.
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.json({ isPta: false, ptaGrade: null, classRepScopes: [] });
    const scope = await getRepresentativeScope(req.user.id);
    return res.json(scope);
  } catch (err) {
    console.error('GET /api/representatives/me error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/representatives?grade=3 (admin) — current PTA + all three
// divisions' class reps for a grade, for the assignment screen.
router.get('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const grade = Number(req.query.grade);
    if (!grade) return res.status(400).json({ message: 'grade is required.' });

    const [ptaRow, classRepRows] = await Promise.all([
      db('pta_representatives').join('guardians', 'guardians.id', 'pta_representatives.guardian_id').where({ grade }).select('guardians.*').first(),
      db('class_representatives').join('guardians', 'guardians.id', 'class_representatives.guardian_id').where({ 'class_representatives.grade': grade }).select('guardians.*', 'class_representatives.division', 'class_representatives.is_pta_default'),
    ]);

    const byDivision = {};
    classRepRows.forEach((r) => { byDivision[r.division] = { ...guardianLabel(r), isPtaDefault: !!r.is_pta_default }; });

    return res.json({
      grade,
      pta: ptaRow ? guardianLabel(ptaRow) : null,
      classReps: DIVISIONS.map((division) => ({ division, rep: byDivision[division] || null })),
    });
  } catch (err) {
    console.error('GET /api/representatives error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/representatives/eligible?grade=3&division=alpha (admin) — parents
// (guardians with a login) whose ward is in that grade/division, for the
// assignment dropdown. division is optional (omit for the PTA picker, which
// draws from the whole grade).
router.get('/eligible', auth, authorize(['admin']), async (req, res) => {
  try {
    const grade = Number(req.query.grade);
    if (!grade) return res.status(400).json({ message: 'grade is required.' });

    let query = db('student_guardians')
      .join('students', 'students.id', 'student_guardians.student_id')
      .join('guardians', 'guardians.id', 'student_guardians.guardian_id')
      .whereNotNull('guardians.user_id')
      .where({ 'students.grade': grade });
    if (req.query.division) query = query.where({ 'students.division': req.query.division });

    const rows = await query
      .select('guardians.id', 'guardians.full_name', 'guardians.mobile', 'students.division', 'students.first_name', 'students.last_name')
      .groupBy('guardians.id');

    return res.json({ parents: rows.map((r) => ({ guardianId: r.id, name: r.full_name, mobile: r.mobile, wardDivision: r.division, wardName: `${r.first_name} ${r.last_name}` })) });
  } catch (err) {
    console.error('GET /api/representatives/eligible error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/representatives/pta (admin) — { grade, guardianId }
router.put('/pta', auth, authorize(['admin']), async (req, res) => {
  try {
    const { grade, guardianId } = req.body;
    if (!grade || !guardianId) return res.status(400).json({ message: 'grade and guardianId are required.' });
    await assignPta(Number(grade), Number(guardianId));
    return res.json({ message: 'PTA rep assigned.' });
  } catch (err) {
    return res.status(409).json({ message: err.message });
  }
});

// DELETE /api/representatives/pta/:grade (admin)
router.delete('/pta/:grade', auth, authorize(['admin']), async (req, res) => {
  try {
    await removePta(Number(req.params.grade));
    return res.json({ message: 'PTA rep removed.' });
  } catch (err) {
    console.error('DELETE /api/representatives/pta error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/representatives/class-rep (admin) — { grade, division, guardianId }
router.put('/class-rep', auth, authorize(['admin']), async (req, res) => {
  try {
    const { grade, division, guardianId } = req.body;
    if (!grade || !division || !guardianId) return res.status(400).json({ message: 'grade, division and guardianId are required.' });
    if (!DIVISIONS.includes(division)) return res.status(400).json({ message: 'Invalid division.' });
    await assignClassRep(Number(grade), division, Number(guardianId));
    return res.json({ message: 'Class representative assigned.' });
  } catch (err) {
    return res.status(409).json({ message: err.message });
  }
});

// DELETE /api/representatives/class-rep/:grade/:division (admin)
router.delete('/class-rep/:grade/:division', auth, authorize(['admin']), async (req, res) => {
  try {
    await removeClassRep(Number(req.params.grade), req.params.division);
    return res.json({ message: 'Class representative removed.' });
  } catch (err) {
    return res.status(409).json({ message: err.message });
  }
});

module.exports = router;
