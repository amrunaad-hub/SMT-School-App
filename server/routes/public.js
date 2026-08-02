const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db/database');
const { upload, publicUrlFor } = require('../utils/upload');
const { serializeRow, serializeRows } = require('../utils/serialize');

const serialize = (row) => serializeRow(row, { boolFields: ['is_draft'] });

const REQUIRED_SUBMIT_FIELDS = ['childName', 'dob', 'applyingForGrade', 'parentName', 'parentMobile'];

const CAMEL_TO_SNAKE = {
  childName: 'child_name', dob: 'dob', currentSchool: 'current_school',
  applyingForGrade: 'applying_for_grade', enquiryType: 'enquiry_type', area: 'area',
  parentName: 'parent_name', parentMobile: 'parent_mobile', parentEmail: 'parent_email',
  address: 'address', bloodGroup: 'blood_group', medicalNotes: 'medical_notes',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

async function generateEnquiryCode() {
  const year = new Date().getFullYear();
  const prefix = `ENQ-${year}-`;
  const last = await db('admissions').where('enquiry_code', 'like', `${prefix}%`).orderBy('enquiry_code', 'desc').first();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.enquiry_code.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
}

// This whole router is internet-facing with no login required, so it gets its
// own tighter limit than the general /api one in app.js.
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
}));

// POST /api/public/admissions/draft — start (or save progress on) an application
// without requiring an account. Every public admission — draft or direct-submit —
// gets a draft_token: it's the family's only way to resume, check status, or
// attach documents later without logging in.
router.post('/admissions/draft', async (req, res) => {
  try {
    if (!req.body.childName || !String(req.body.childName).trim()) {
      return res.status(400).json({ message: 'childName is required to start an application.' });
    }

    const draftToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const [id] = await db('admissions').insert({
      ...bodyToRow(req.body),
      source: 'Website',
      status: 'Enquiry',
      is_draft: true,
      draft_token: draftToken,
      created_at: now,
      updated_at: now,
    });
    const admission = await db('admissions').where({ id }).first();
    return res.status(201).json(serialize(admission));
  } catch (err) {
    console.error('POST /api/public/admissions/draft error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/public/admissions/draft/:token — update an in-progress draft.
router.put('/admissions/draft/:token', async (req, res) => {
  try {
    const admission = await db('admissions').where({ draft_token: req.params.token }).first();
    if (!admission) return res.status(404).json({ message: 'Application not found.' });
    if (!admission.is_draft) return res.status(409).json({ message: 'This application has already been submitted and can no longer be edited.' });

    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    await db('admissions').where({ id: admission.id }).update(updates);
    const updated = await db('admissions').where({ id: admission.id }).first();
    return res.json(serialize(updated));
  } catch (err) {
    console.error('PUT /api/public/admissions/draft/:token error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/public/admissions/:token — resume a draft or check a submitted
// application's status, without logging in.
router.get('/admissions/:token', async (req, res) => {
  try {
    const admission = await db('admissions').where({ draft_token: req.params.token }).first();
    if (!admission) return res.status(404).json({ message: 'Application not found.' });
    return res.json(serialize(admission));
  } catch (err) {
    console.error('GET /api/public/admissions/:token error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/public/admissions/draft/:token/submit — finalize a draft: validates
// required fields and assigns a permanent enquiry code.
router.post('/admissions/draft/:token/submit', async (req, res) => {
  try {
    const admission = await db('admissions').where({ draft_token: req.params.token }).first();
    if (!admission) return res.status(404).json({ message: 'Application not found.' });
    if (!admission.is_draft) return res.status(409).json({ message: 'This application has already been submitted.' });

    const merged = { ...serialize(admission), ...req.body };
    const missing = REQUIRED_SUBMIT_FIELDS.filter((field) => !merged[field]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    const enquiryCode = await generateEnquiryCode();
    await db('admissions').where({ id: admission.id }).update({
      ...bodyToRow(req.body),
      enquiry_code: enquiryCode,
      is_draft: false,
      updated_at: new Date().toISOString(),
    });
    const updated = await db('admissions').where({ id: admission.id }).first();
    return res.json(serialize(updated));
  } catch (err) {
    console.error('POST /api/public/admissions/draft/:token/submit error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/public/admissions — one-shot submit for families who don't need the
// save-and-resume flow. Still returns a draft_token so they can check status or
// attach documents afterward without an account.
router.post('/admissions', async (req, res) => {
  try {
    const missing = REQUIRED_SUBMIT_FIELDS.filter((field) => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    const enquiryCode = await generateEnquiryCode();
    const draftToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const [id] = await db('admissions').insert({
      ...bodyToRow(req.body),
      enquiry_code: enquiryCode,
      source: 'Website',
      status: 'Enquiry',
      is_draft: false,
      draft_token: draftToken,
      created_at: now,
      updated_at: now,
    });
    const admission = await db('admissions').where({ id }).first();
    return res.status(201).json(serialize(admission));
  } catch (err) {
    console.error('POST /api/public/admissions error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/public/admissions/:token/documents — attach a supporting document
// (birth certificate, previous TC, photo, etc.) to an application, no login.
router.post('/admissions/:token/documents', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ message: 'No file provided.' });

    try {
      const admission = await db('admissions').where({ draft_token: req.params.token }).first();
      if (!admission) return res.status(404).json({ message: 'Application not found.' });

      const fileUrl = publicUrlFor(req.file.path);
      const docTypes = ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other'];
      const [id] = await db('documents').insert({
        owner_type: 'admission',
        owner_id: admission.id,
        doc_type: docTypes.includes(req.body.docType) ? req.body.docType : 'Other',
        file_url: fileUrl,
        original_filename: req.file.originalname,
      });
      const document = await db('documents').where({ id }).first();
      return res.status(201).json(serializeRow(document));
    } catch (uploadErr) {
      console.error('POST /api/public/admissions/:token/documents error:', uploadErr.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });
});

// GET /api/public/admissions/:token/documents — list what's been attached so far.
router.get('/admissions/:token/documents', async (req, res) => {
  try {
    const admission = await db('admissions').where({ draft_token: req.params.token }).first();
    if (!admission) return res.status(404).json({ message: 'Application not found.' });
    const rows = await db('documents').where({ owner_type: 'admission', owner_id: admission.id }).orderBy('uploaded_at', 'desc');
    return res.json({ documents: serializeRows(rows) });
  } catch (err) {
    console.error('GET /api/public/admissions/:token/documents error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
