const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { upload, publicUrlFor } = require('../utils/upload');
const { serializeRow } = require('../utils/serialize');

const OWNER_TYPES = ['student', 'admission', 'period_note', 'leave_request'];
const DOC_TYPES = ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other'];

// POST /api/uploads — multipart form: file, category, and optionally
// ownerType/ownerId/docType to also record a `documents` row.
router.post('/', auth, authorize(['admin', 'teacher', 'principal']), (req, res) => {
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

      if (!ownerType && !ownerId) {
        return res.json({ fileUrl, originalFilename: req.file.originalname });
      }

      if (!OWNER_TYPES.includes(ownerType) || !ownerId) {
        return res.status(400).json({ message: 'ownerType and ownerId are required together.' });
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
