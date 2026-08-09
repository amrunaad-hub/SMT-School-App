const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db/database');
const { upload, publicUrlFor } = require('../utils/upload');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { validatePublicSubmitMandatory } = require('../utils/validateAdmissionMandatory');

const JSON_FIELDS = ['guardians_draft', 'siblings_declared'];
const serialize = (row) => serializeRow(row, { boolFields: ['is_draft'], jsonFields: JSON_FIELDS, jsonDefault: [] });

// applyingForGrade isn't one of the reference ERP's starred mandatory fields,
// but was already required by this app before that parity work — kept as-is.
const REQUIRED_SUBMIT_FIELDS = ['applyingForGrade'];

const CAMEL_TO_SNAKE = {
  childName: 'child_name', dob: 'dob', currentSchool: 'current_school',
  applyingForGrade: 'applying_for_grade', enquiryType: 'enquiry_type', area: 'area',
  parentName: 'parent_name', parentMobile: 'parent_mobile', parentEmail: 'parent_email',
  address: 'address', bloodGroup: 'blood_group', medicalNotes: 'medical_notes',
  gender: 'gender', middleName: 'middle_name', religion: 'religion', caste: 'caste',
  subCaste: 'sub_caste', category: 'category', nationality: 'nationality',
  motherTongue: 'mother_tongue', birthPlace: 'birth_place', birthTaluka: 'birth_taluka',
  birthDistrict: 'birth_district', birthState: 'birth_state', nativeAddress: 'native_address',
  studentSaralNo: 'student_saral_no', grNo: 'gr_no', penNo: 'pen_no',
  aadharNumber: 'aadhar_number', apaarId: 'apaar_id', heightCm: 'height_cm', weightKg: 'weight_kg',
  studentEmail: 'student_email', studentMobile: 'student_mobile', handicapType: 'handicap_type',
  previousSchoolBoard: 'previous_school_board', previousSchoolPassYear: 'previous_school_pass_year',
  previousSchoolSeatNumber: 'previous_school_seat_number', previousSchoolPercentage: 'previous_school_percentage',
  previousSchoolLcNumber: 'previous_school_lc_number', previousSchoolLcDate: 'previous_school_lc_date',
  previousSchoolLeaveDate: 'previous_school_leave_date', previousSchoolRemarks: 'previous_school_remarks',
  previousSchoolReasonLeave: 'previous_school_reason_leave', previousSchoolMedium: 'previous_school_medium',
};

const JSON_BODY_FIELDS = { guardiansDraft: 'guardians_draft', siblingsDeclared: 'siblings_declared' };

function bodyToRow(body) {
  const row = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) { row[column] = value; return; }
    const jsonColumn = JSON_BODY_FIELDS[key];
    if (jsonColumn) row[jsonColumn] = JSON.stringify(value || []);
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
    const [{ id }] = await db('admissions').insert({
      ...bodyToRow(req.body),
      source: 'Website',
      status: 'Enquiry',
      is_draft: true,
      draft_token: draftToken,
      created_at: now,
      updated_at: now,
    }).returning('id');
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

    // validatePublicSubmitMandatory expects a snake_case DB row shape, so build
    // a candidate row (existing admission + this request's incoming changes)
    // rather than reusing the camelCase `merged` object above.
    const candidateRow = { ...admission, ...bodyToRow(req.body) };
    const mandatoryMissing = validatePublicSubmitMandatory(candidateRow);

    const allMissing = [...missing, ...mandatoryMissing];
    if (allMissing.length) {
      return res.status(400).json({ message: `Missing required fields: ${allMissing.join(', ')}` });
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
    const mandatoryMissing = validatePublicSubmitMandatory(bodyToRow(req.body));
    const allMissing = [...missing, ...mandatoryMissing];
    if (allMissing.length) {
      return res.status(400).json({ message: `Missing required fields: ${allMissing.join(', ')}` });
    }

    const enquiryCode = await generateEnquiryCode();
    const draftToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const [{ id }] = await db('admissions').insert({
      ...bodyToRow(req.body),
      enquiry_code: enquiryCode,
      source: 'Website',
      status: 'Enquiry',
      is_draft: false,
      draft_token: draftToken,
      created_at: now,
      updated_at: now,
    }).returning('id');
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
      const [{ id }] = await db('documents').insert({
        owner_type: 'admission',
        owner_id: admission.id,
        doc_type: docTypes.includes(req.body.docType) ? req.body.docType : 'Other',
        file_url: fileUrl,
        original_filename: req.file.originalname,
      }).returning('id');
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
