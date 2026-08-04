const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { upload, publicUrlFor } = require('../utils/upload');
const { serializeRow } = require('../utils/serialize');
const { isParentOfStudent } = require('../utils/classAccess');

const OWNER_TYPES = ['student', 'admission', 'period_note', 'leave_request', 'notice'];
const DOC_TYPES = ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other'];

// POST /api/uploads — multipart form: file, category, and optionally
// ownerType/ownerId/docType to also record a `documents` row.
router.post('/', auth, authorize(['admin', 'teacher', 'principal', 'parent']), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided.' });
    }

    try {
      const fileUrl = publicUrlFor(req.file.path);
      const { ownerType, ownerId, docType } = req.body;

      // Parents may attach a document directly only to their own child's leave
      // request (evidence for a leave application, no approval workflow
      // needed there) — every other owner type (student/admission/period_note)
      // requires going through POST /api/students/:id/edit-requests instead,
      // so an upload alone can never bypass that approval queue.
      if (req.user.role === 'parent' && (ownerType || ownerId)) {
        if (ownerType !== 'leave_request' || !ownerId) {
          return res.status(403).json({ message: 'Parents cannot attach documents directly; submit an edit request instead.' });
        }
        const leaveRequest = await db('leave_requests').where({ id: Number(ownerId) }).first();
        if (!leaveRequest || !(await isParentOfStudent(db, req.user.id, leaveRequest.student_id))) {
          return res.status(403).json({ message: 'Not your child\'s leave request.' });
        }
      }

      if (!ownerType && !ownerId) {
        return res.json({ fileUrl, originalFilename: req.file.originalname });
      }

      if (!OWNER_TYPES.includes(ownerType) || !ownerId) {
        return res.status(400).json({ message: 'ownerType and ownerId are required together.' });
      }

      // A teacher may only attach to a notice they created themselves;
      // admin/principal can attach to any (mirrors PUT /api/notices/:id's
      // own canModifyNotice check).
      if (ownerType === 'notice' && req.user.role === 'teacher') {
        const notice = await db('notices').where({ id: Number(ownerId) }).first();
        if (!notice || notice.created_by_user_id !== req.user.id) {
          return res.status(403).json({ message: 'You can only attach documents to notices you created.' });
        }
      }

      const [id] = await db('documents').insert({
        owner_type: ownerType,
        owner_id: Number(ownerId),
        doc_type: DOC_TYPES.includes(docType) ? docType : 'Other',
        file_url: fileUrl,
        original_filename: req.file.originalname,
        uploaded_by: typeof req.user.id === 'number' ? req.user.id : null,
      });

      const document = await db('documents').where({ id }).first();
      return res.status(201).json({ fileUrl, originalFilename: req.file.originalname, document: serializeRow(document) });
    } catch (uploadErr) {
      console.error('POST /api/uploads error:', uploadErr.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });
});

// GET /api/uploads/mine — every document the logged-in user has personally
// uploaded (documents.uploaded_by), across every owner type, with a
// human-readable context label resolved per type — the "My Documents"
// repository. Batches one lookup query per owner_type present rather than
// one per document.
router.get('/mine', auth, async (req, res) => {
  try {
    if (typeof req.user.id !== 'number') return res.json({ documents: [] });

    const rows = await db('documents').where({ uploaded_by: req.user.id }).orderBy('uploaded_at', 'desc');
    if (!rows.length) return res.json({ documents: [] });

    const idsByType = {};
    rows.forEach((r) => { (idsByType[r.owner_type] ||= new Set()).add(r.owner_id); });

    const contextByKey = {};

    if (idsByType.leave_request) {
      const leaveRows = await db('leave_requests')
        .join('students', 'students.id', 'leave_requests.student_id')
        .whereIn('leave_requests.id', [...idsByType.leave_request])
        .select('leave_requests.id', 'leave_requests.from_date', 'leave_requests.to_date', 'students.first_name', 'students.last_name');
      leaveRows.forEach((r) => {
        contextByKey[`leave_request:${r.id}`] = {
          classification: 'Leave Application',
          label: `${r.first_name} ${r.last_name} · ${r.from_date}${r.to_date !== r.from_date ? ` to ${r.to_date}` : ''}`,
        };
      });
    }

    if (idsByType.period_note) {
      const noteRows = await db('timetable_period_notes').whereIn('id', [...idsByType.period_note]);
      noteRows.forEach((r) => {
        contextByKey[`period_note:${r.id}`] = {
          classification: 'Classwork / Homework',
          label: `Grade ${r.grade} ${r.division.charAt(0).toUpperCase() + r.division.slice(1)} · ${r.date} · Period ${r.period_index}`,
        };
      });
    }

    if (idsByType.notice) {
      const noticeRows = await db('notices').whereIn('id', [...idsByType.notice]);
      noticeRows.forEach((r) => {
        contextByKey[`notice:${r.id}`] = { classification: 'Notice Attachment', label: r.title };
      });
    }

    if (idsByType.student) {
      const studentRows = await db('students').whereIn('id', [...idsByType.student]);
      studentRows.forEach((r) => {
        contextByKey[`student:${r.id}`] = { classification: 'Student Record', label: `${r.first_name} ${r.last_name}` };
      });
    }

    if (idsByType.admission) {
      const admissionRows = await db('admissions').whereIn('id', [...idsByType.admission]);
      admissionRows.forEach((r) => {
        contextByKey[`admission:${r.id}`] = { classification: 'Admission', label: r.child_name };
      });
    }

    const documents = rows.map((r) => {
      const ctx = contextByKey[`${r.owner_type}:${r.owner_id}`] || { classification: r.owner_type, label: '' };
      return {
        id: r.id,
        docType: r.doc_type,
        fileUrl: r.file_url,
        originalFilename: r.original_filename,
        uploadedAt: r.uploaded_at,
        classification: ctx.classification,
        contextLabel: ctx.label,
      };
    });

    return res.json({ documents });
  } catch (err) {
    console.error('GET /api/uploads/mine error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/uploads?ownerType=student&ownerId=5 — list documents for a given owner.
router.get('/', auth, async (req, res) => {
  try {
    const { ownerType, ownerId } = req.query;
    if (!OWNER_TYPES.includes(ownerType) || !ownerId) {
      return res.status(400).json({ message: 'ownerType and ownerId query params are required.' });
    }
    const rows = await db('documents').where({ owner_type: ownerType, owner_id: Number(ownerId) }).orderBy('uploaded_at', 'desc');
    return res.json({ documents: rows.map((r) => serializeRow(r)) });
  } catch (err) {
    console.error('GET /api/uploads error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/uploads/:id — remove a document record (admin only; file itself is
// left on disk since it may still be referenced by a backup snapshot).
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('documents').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Document not found.' });
    return res.json({ message: 'Document deleted.' });
  } catch (err) {
    console.error('DELETE /api/uploads/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
