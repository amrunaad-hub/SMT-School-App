const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow } = require('../utils/serialize');
const { formAppliesToUser } = require('../utils/formAudience');
const { normalizeAudience } = require('../utils/noticeAudience');

const FIELD_TYPES = ['text', 'number', 'textarea', 'radio', 'select', 'multiselect', 'file'];
const JSON_FIELDS = ['fields', 'target_audience'];
const BOOL_FIELDS = ['is_active'];
const MANAGE_ROLES = ['admin', 'principal', 'superuser'];

const serializeForm = (row) => {
  const out = serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, jsonDefault: [] });
  out.targetAudience = normalizeAudience(out.targetAudience);
  return out;
};

const MIN_OPTIONS = 2;

// Trims/drops blank options in place — the client now does this too before
// saving, but a direct API call shouldn't be able to bypass it and store a
// field with empty-string options.
function normalizeFields(fields) {
  if (!Array.isArray(fields)) return fields;
  return fields.map((f) => (
    f && ['radio', 'select', 'multiselect'].includes(f.type) && Array.isArray(f.options)
      ? { ...f, options: f.options.map((o) => String(o).trim()).filter(Boolean) }
      : f
  ));
}

function validateFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return 'At least one field is required.';
  for (const f of fields) {
    if (!f || !f.id || !String(f.label || '').trim() || !FIELD_TYPES.includes(f.type)) {
      return 'Each field needs a label and a valid type.';
    }
    if (['radio', 'select', 'multiselect'].includes(f.type) && (!Array.isArray(f.options) || f.options.length < MIN_OPTIONS)) {
      return `Field "${f.label}" needs at least ${MIN_OPTIONS} options.`;
    }
  }
  return null;
}

// Same "must actually reach someone" rule as Notices — additive facets, so
// any one of Grade/Division (→ parents), Teachers, or Specific Students
// being non-empty is enough; there's no separate role toggle to check.
function validateAudience(targetAudience) {
  const a = normalizeAudience(targetAudience);
  const hasGradeDivision = a.allGrades || a.gradeSelections.length > 0;
  const hasTeachers = a.allTeachers || a.teacherIds.length > 0;
  const hasStudents = a.studentIds.length > 0;
  if (!hasGradeDivision && !hasTeachers && !hasStudents) return 'Select at least a grade, teachers, or specific students.';
  return null;
}

// POST /api/forms (admin/principal/superuser)
router.post('/', auth, authorize(MANAGE_ROLES), async (req, res) => {
  try {
    const { title, description, targetAudience } = req.body;
    const fields = normalizeFields(req.body.fields);
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required.' });
    const fieldsErr = validateFields(fields);
    if (fieldsErr) return res.status(400).json({ message: fieldsErr });
    const audienceErr = validateAudience(targetAudience);
    if (audienceErr) return res.status(400).json({ message: audienceErr });

    const now = new Date().toISOString();
    const [id] = await db('forms').insert({
      title: String(title).trim(),
      description: description || '',
      fields: JSON.stringify(fields),
      target_audience: JSON.stringify(normalizeAudience(targetAudience)),
      is_active: 1,
      created_by: req.user.id,
      created_at: now,
      updated_at: now,
    });
    const row = await db('forms').where({ id }).first();
    return res.status(201).json(serializeForm(row));
  } catch (err) {
    console.error('POST /api/forms error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/forms/:id (admin/principal/superuser) — edits and/or toggles isActive
router.put('/:id', auth, authorize(MANAGE_ROLES), async (req, res) => {
  try {
    const existing = await db('forms').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ message: 'Form not found.' });

    const { title, description, targetAudience, isActive } = req.body;
    const fields = req.body.fields !== undefined ? normalizeFields(req.body.fields) : undefined;
    const updates = {};

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'Title is required.' });
      updates.title = String(title).trim();
    }
    if (description !== undefined) updates.description = description || '';
    if (fields !== undefined) {
      const fieldsErr = validateFields(fields);
      if (fieldsErr) return res.status(400).json({ message: fieldsErr });
      updates.fields = JSON.stringify(fields);
    }

    if (targetAudience !== undefined) {
      const audienceErr = validateAudience(targetAudience);
      if (audienceErr) return res.status(400).json({ message: audienceErr });
      updates.target_audience = JSON.stringify(normalizeAudience(targetAudience));
    }
    if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
    updates.updated_at = new Date().toISOString();

    await db('forms').where({ id: req.params.id }).update(updates);
    const row = await db('forms').where({ id: req.params.id }).first();
    return res.json(serializeForm(row));
  } catch (err) {
    console.error('PUT /api/forms/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/forms/:id (admin/principal/superuser) — form_submissions cascade
// via FK; their attachment documents + underlying files are cleaned up here
// since SQLite FKs don't reach into the generic `documents` table.
router.delete('/:id', auth, authorize(MANAGE_ROLES), async (req, res) => {
  try {
    const existing = await db('forms').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ message: 'Form not found.' });

    const submissionIds = (await db('form_submissions').where({ form_id: req.params.id }).select('id')).map((r) => r.id);
    if (submissionIds.length) {
      const docs = await db('documents').where({ owner_type: 'form_submission' }).whereIn('owner_id', submissionIds);
      docs.forEach((doc) => {
        const filePath = path.join(__dirname, '..', doc.file_url.replace(/^\//, ''));
        fs.unlink(filePath, () => {}); // best-effort — a missing file shouldn't block deletion
      });
      await db('documents').where({ owner_type: 'form_submission' }).whereIn('owner_id', submissionIds).del();
    }
    await db('forms').where({ id: req.params.id }).del();
    return res.json({ message: 'Form deleted.' });
  } catch (err) {
    console.error('DELETE /api/forms/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/forms (admin/principal/superuser) — every form + response count
router.get('/', auth, authorize(MANAGE_ROLES), async (req, res) => {
  try {
    const rows = await db('forms').orderBy('created_at', 'desc');
    const counts = await db('form_submissions').select('form_id').count({ count: '*' }).groupBy('form_id');
    const countByForm = Object.fromEntries(counts.map((c) => [c.form_id, Number(c.count)]));
    const forms = rows.map(serializeForm).map((f) => ({ ...f, responseCount: countByForm[f.id] || 0 }));
    return res.json({ forms });
  } catch (err) {
    console.error('GET /api/forms error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/forms/mine (parent/teacher) — forms whose audience matches this
// user, each flagged with whether they've already responded.
router.get('/mine', auth, async (req, res) => {
  try {
    if (!['parent', 'teacher'].includes(req.user.role)) return res.json({ forms: [] });
    const rows = await db('forms').where({ is_active: 1 }).orderBy('created_at', 'desc');
    const forms = rows.map(serializeForm);
    const applicable = [];
    for (const form of forms) {
      if (await formAppliesToUser(db, form, req.user)) applicable.push(form);
    }
    if (applicable.length) {
      const mySubmissions = await db('form_submissions')
        .where({ submitted_by: req.user.id })
        .whereIn('form_id', applicable.map((f) => f.id));
      const submittedIds = new Set(mySubmissions.map((s) => s.form_id));
      applicable.forEach((f) => { f.hasSubmitted = submittedIds.has(f.id); });
    }
    return res.json({ forms: applicable });
  } catch (err) {
    console.error('GET /api/forms/mine error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/forms/:id — form detail. Admin/principal/superuser unrestricted;
// parent/teacher gated by formAppliesToUser, plus their own prior answers
// (if any) so a resubmit reopens pre-filled.
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await db('forms').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ message: 'Form not found.' });
    const form = serializeForm(row);

    if (!MANAGE_ROLES.includes(req.user.role)) {
      if (!(await formAppliesToUser(db, form, req.user))) {
        return res.status(403).json({ message: 'This form is not available to you.' });
      }
    }

    let mySubmission = null;
    if (['parent', 'teacher'].includes(req.user.role)) {
      const sub = await db('form_submissions').where({ form_id: req.params.id, submitted_by: req.user.id }).first();
      if (sub) mySubmission = { id: sub.id, answers: JSON.parse(sub.answers || '{}'), submittedAt: sub.submitted_at };
    }
    return res.json({ ...form, mySubmission });
  } catch (err) {
    console.error('GET /api/forms/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/forms/:id/submit (parent/teacher) — upserts this user's single
// response. File-type fields are exempt from the "required" check here even
// if marked required in the field definition: the client's own upload flow
// needs to call this endpoint once (with the file field still empty) just to
// obtain a submission id to attach the upload to, then calls it again with
// the uploaded document's id filled in — enforcing "required" on a field
// that can only ever be filled on the second of two necessary calls would
// make a required file field impossible to satisfy. The client UI still
// blocks its own Submit button until a required file is actually attached.
router.post('/:id/submit', auth, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const row = await db('forms').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ message: 'Form not found.' });
    const form = serializeForm(row);
    if (!form.isActive) return res.status(409).json({ message: 'This form is no longer accepting responses.' });
    if (!(await formAppliesToUser(db, form, req.user))) {
      return res.status(403).json({ message: 'This form is not available to you.' });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers object is required.' });
    }

    for (const field of form.fields) {
      const value = answers[field.id];
      const isEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      if (field.required && field.type !== 'file' && isEmpty) {
        return res.status(400).json({ message: `"${field.label}" is required.` });
      }
      if (['radio', 'select'].includes(field.type) && !isEmpty && !field.options.includes(value)) {
        return res.status(400).json({ message: `"${field.label}" has an invalid selection.` });
      }
      if (field.type === 'multiselect' && Array.isArray(value) && value.some((v) => !field.options.includes(v))) {
        return res.status(400).json({ message: `"${field.label}" has an invalid selection.` });
      }
    }

    const now = new Date().toISOString();
    await db('form_submissions')
      .insert({ form_id: req.params.id, submitted_by: req.user.id, answers: JSON.stringify(answers), submitted_at: now })
      .onConflict(['form_id', 'submitted_by'])
      .merge(['answers', 'submitted_at']);

    const submission = await db('form_submissions').where({ form_id: req.params.id, submitted_by: req.user.id }).first();

    // File-type answers must reference a document this user actually
    // uploaded onto this exact submission — otherwise a parent could submit
    // someone else's document id and have it surface as their own attachment
    // in the admin review screen / Excel export.
    const fieldsById = Object.fromEntries(form.fields.map((f) => [f.id, f]));
    for (const [fieldId, value] of Object.entries(answers)) {
      if (fieldsById[fieldId]?.type !== 'file' || value == null || value === '') continue;
      const doc = await db('documents').where({ id: Number(value), owner_type: 'form_submission', owner_id: submission.id, uploaded_by: req.user.id }).first();
      if (!doc) return res.status(400).json({ message: `"${fieldsById[fieldId].label}" attachment is invalid.` });
    }

    return res.status(201).json({ id: submission.id, answers: JSON.parse(submission.answers), submittedAt: submission.submitted_at });
  } catch (err) {
    console.error('POST /api/forms/:id/submit error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/forms/:id/submissions (admin/principal/superuser) — every
// response, submitter identified, file answers resolved to a real link.
router.get('/:id/submissions', auth, authorize(MANAGE_ROLES), async (req, res) => {
  try {
    const row = await db('forms').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ message: 'Form not found.' });
    const form = serializeForm(row);

    const submissions = await db('form_submissions').where({ form_id: req.params.id }).orderBy('submitted_at', 'desc');
    if (!submissions.length) return res.json({ form, submissions: [] });

    const userIds = [...new Set(submissions.map((s) => s.submitted_by))];
    const [users, staffRows, guardianRows, docs] = await Promise.all([
      db('users').whereIn('id', userIds),
      db('staff').whereIn('user_id', userIds),
      db('guardians').whereIn('user_id', userIds),
      db('documents').where({ owner_type: 'form_submission' }).whereIn('owner_id', submissions.map((s) => s.id)),
    ]);
    const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
    const staffByUserId = Object.fromEntries(staffRows.map((s) => [s.user_id, s]));
    const guardiansByUserId = Object.fromEntries(guardianRows.map((g) => [g.user_id, g]));
    const docsById = Object.fromEntries(docs.map((d) => [d.id, d]));
    const fieldsById = Object.fromEntries(form.fields.map((f) => [f.id, f]));

    const shaped = submissions.map((s) => {
      const user = usersById[s.submitted_by];
      const name = user?.role === 'parent'
        ? (guardiansByUserId[s.submitted_by]?.full_name || user?.username || 'Unknown')
        : (staffByUserId[s.submitted_by]?.display_name || user?.username || 'Unknown');
      const answers = JSON.parse(s.answers || '{}');
      const resolvedAnswers = {};
      Object.entries(answers).forEach(([fieldId, value]) => {
        if (fieldsById[fieldId]?.type === 'file' && value) {
          const doc = docsById[Number(value)];
          resolvedAnswers[fieldId] = doc ? { isFile: true, fileUrl: doc.file_url, originalFilename: doc.original_filename } : null;
        } else {
          resolvedAnswers[fieldId] = value;
        }
      });
      return { id: s.id, submittedBy: name, role: user?.role || null, submittedAt: s.submitted_at, answers: resolvedAnswers };
    });
    return res.json({ form, submissions: shaped });
  } catch (err) {
    console.error('GET /api/forms/:id/submissions error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
