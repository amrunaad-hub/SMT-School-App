const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Auto-generate examCode
const generateExamCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `EX-${year}-`;
  const last = await Exam.findOne({ examCode: { $regex: `^${prefix}` } })
    .sort({ examCode: -1 })
    .lean();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.examCode.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/exams
router.get('/', auth, async (req, res) => {
  try {
    const { grade, subject, status, academicYear } = req.query;
    const filter = {};
    if (grade && grade !== 'all') filter.grade = Number(grade);
    if (subject && subject !== 'all') filter.subject = { $regex: subject, $options: 'i' };
    if (status && status !== 'all') filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    const exams = await Exam.find(filter).sort({ scheduledDate: 1 }).lean();
    return res.json({ exams, total: exams.length });
  } catch (err) {
    console.error('GET /api/exams error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/exams/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(exam);
  } catch (err) {
    console.error('GET /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/exams (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const examCode = await generateExamCode();
    const exam = new Exam({ ...req.body, examCode });
    await exam.save();
    return res.status(201).json(exam);
  } catch (err) {
    console.error('POST /api/exams error:', err.message);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate exam code.' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/exams/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    return res.json(exam);
  } catch (err) {
    console.error('PUT /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/exams/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    await ExamResult.deleteMany({ exam: req.params.id });
    return res.json({ message: 'Exam and results deleted.' });
  } catch (err) {
    console.error('DELETE /api/exams/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/exams/:id/results
router.get('/:id/results', auth, async (req, res) => {
  try {
    const results = await ExamResult.find({ exam: req.params.id })
      .populate('student', 'firstName lastName rollNo grade division studentCode')
      .sort({ 'student.rollNo': 1 })
      .lean({ virtuals: true });
    return res.json({ results, total: results.length });
  } catch (err) {
    console.error('GET /api/exams/:id/results error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/exams/:id/results (admin) — bulk upsert
router.post('/:id/results', auth, authorize(['admin']), async (req, res) => {
  try {
    const { records } = req.body; // [{studentId, marksObtained, isAbsent, remarks}]
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'records[] array is required.' });
    }

    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const computeGrade = (marks, max) => {
      const pct = (marks / max) * 100;
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C';
      if (pct >= 35) return 'D';
      return 'F';
    };

    const ops = records.map((rec) => ({
      updateOne: {
        filter: { exam: req.params.id, student: rec.studentId },
        update: {
          $set: {
            exam: req.params.id,
            student: rec.studentId,
            isAbsent: !!rec.isAbsent,
            marksObtained: rec.isAbsent ? null : Number(rec.marksObtained),
            grade: rec.isAbsent ? null : computeGrade(Number(rec.marksObtained), exam.maxMarks),
            remarks: rec.remarks || '',
          },
        },
        upsert: true,
      },
    }));

    const result = await ExamResult.bulkWrite(ops);
    return res.json({ message: `${records.length} results saved.`, result });
  } catch (err) {
    console.error('POST /api/exams/:id/results error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
