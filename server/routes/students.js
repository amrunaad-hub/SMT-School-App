const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { generateUsername, generateTempPassword } = require('../utils/credentials');
const { parentOwnsStudent } = require('../utils/parentAccess');

const BOOL_FIELDS = ['is_rte', 'is_maharashtrian'];
const JSON_FIELDS = ['siblings_declared'];
const serialize = (row) => serializeRow(row, { boolFields: BOOL_FIELDS, jsonFields: JSON_FIELDS, jsonDefault: [] });

// Keeps students.parent_name/parent_mobile/parent_email in sync as a denormalized
// snapshot of the primary guardian, so existing reads (StudentProfile, SIS search)
// that predate the guardians table keep working unchanged.
async function syncPrimaryGuardianSnapshot(studentId, executor) {
  const primary = await executor('student_guardians')
    .join('guardians', 'guardians.id', 'student_guardians.guardian_id')
    .where({ 'student_guardians.student_id': studentId, 'student_guardians.is_primary': true })
    .select('guardians.full_name', 'guardians.mobile', 'guardians.email')
    .first();
  if (!primary) return;
  await executor('students').where({ id: studentId }).update({
    parent_name: primary.full_name,
    parent_mobile: primary.mobile,
    parent_email: primary.email,
    updated_at: new Date().toISOString(),
  });
}

// Helper: auto-generate studentCode like "G1-ALPHA-001"
const generateStudentCode = (grade, division, rollNo) => {
  const divUpper = String(division).toUpperCase();
  const rollPadded = String(rollNo).padStart(3, '0');
  return `G${grade}-${divUpper}-${rollPadded}`;
};

// GET /api/students
router.get('/', auth, async (req, res) => {
  try {
    const { grade, division, search, page = 1, limit = 40 } = req.query;
    let query = db('students');

    if (grade && grade !== 'all') query = query.where({ grade: Number(grade) });
    if (division && division !== 'all') query = query.where({ division: String(division).toLowerCase() });
    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereILike('first_name', keyword)
          .orWhereILike('last_name', keyword)
          .orWhereILike('student_code', keyword);
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 40));
    const offset = (pageNum - 1) * limitNum;

    const [{ count: total }] = await query.clone().count({ count: '*' });
    const rows = await query.clone().orderBy([{ column: 'grade' }, { column: 'division' }, { column: 'roll_no' }])
      .offset(offset).limit(limitNum);

    return res.json({
      students: serializeRows(rows, { boolFields: BOOL_FIELDS, jsonFields: JSON_FIELDS, jsonDefault: [] }),
      total: Number(total),
      page: pageNum,
      pages: Math.ceil(Number(total) / limitNum),
    });
  } catch (err) {
    console.error('GET /api/students error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students/edit-requests — admin/principal see the full queue
// (optionally filtered by status); a parent sees only their own submissions
// across any of their children, regardless of status filter. Registered
// ahead of GET /:id so "edit-requests" isn't swallowed as an :id value.
router.get('/edit-requests', auth, async (req, res) => {
  try {
    const isAdmin = ['admin', 'principal', 'superuser'].includes(req.user.role);
    const { status } = req.query;
    let query = db('student_edit_requests as r')
      .join('students as s', 's.id', 'r.student_id')
      .join('users as u', 'u.id', 'r.requested_by')
      .select('r.*', 's.first_name as student_first_name', 's.last_name as student_last_name', 's.student_code', 'u.username as requester_username');
    if (isAdmin) {
      if (status) query = query.where('r.status', status);
    } else {
      query = query.where('r.requested_by', req.user.id);
    }
    const rows = await query.orderBy('r.created_at', 'desc');
    const requests = rows.map((row) => ({
      ...serializeRow(row, { jsonFields: ['changes'], jsonDefault: {} }),
      studentName: `${row.student_first_name} ${row.student_last_name}`.trim(),
    }));
    return res.json({ requests, total: requests.length });
  } catch (err) {
    console.error('GET /api/students/edit-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students/:id — admin/principal see any student; every other role
// (parent) must be a linked guardian of this specific student.
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'principal') {
      const owns = await parentOwnsStudent(db, req.user.id, req.params.id);
      if (!owns) return res.status(403).json({ message: 'Not authorized for this student.' });
    }

    const student = await db('students').where({ id: req.params.id }).first();
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const [guardians, documents, house] = await Promise.all([
      db('student_guardians')
        .join('guardians', 'guardians.id', 'student_guardians.guardian_id')
        .where({ 'student_guardians.student_id': student.id })
        .select('guardians.*', 'student_guardians.id as link_id', 'student_guardians.relation', 'student_guardians.is_primary', 'student_guardians.is_emergency_contact'),
      db('documents').where({ owner_type: 'student', owner_id: student.id }).orderBy('uploaded_at', 'desc'),
      student.house_id ? db('houses').where({ id: student.house_id }).first() : null,
    ]);

    return res.json({
      ...serialize(student),
      house: house ? serializeRow(house) : null,
      guardians: serializeRows(guardians, { boolFields: ['is_primary', 'is_emergency_contact'], jsonFields: ['contribution_areas'], jsonDefault: [] }),
      documents: serializeRows(documents),
    });
  } catch (err) {
    console.error('GET /api/students/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const {
      firstName, lastName, grade, division, rollNo, gender, dob,
      parentName, parentMobile, parentEmail, address, photoUrl,
      isRte, isMaharashtrian, admissionYear, status,
    } = req.body;

    if (!firstName || !grade || !division) {
      return res.status(400).json({ message: 'firstName, grade, and division are required.' });
    }

    const gradeNum = Number(grade);
    const divisionLower = String(division).toLowerCase();

    // Determine rollNo if not provided: find next available
    let assignedRollNo = rollNo;
    if (!assignedRollNo) {
      const lastStudent = await db('students')
        .where({ grade: gradeNum, division: divisionLower })
        .orderBy('roll_no', 'desc').first();
      assignedRollNo = lastStudent ? lastStudent.roll_no + 1 : 1;
    }

    const studentCode = generateStudentCode(gradeNum, divisionLower, assignedRollNo);
    const now = new Date().toISOString();

    const [{ id }] = await db('students').insert({
      student_code: studentCode,
      first_name: firstName.trim(),
      last_name: (lastName || '').trim(),
      grade: gradeNum,
      division: divisionLower,
      roll_no: Number(assignedRollNo),
      gender: gender || 'Male',
      dob: dob || null,
      parent_name: parentName || null,
      parent_mobile: parentMobile || null,
      parent_email: parentEmail || null,
      address: address || null,
      photo_url: photoUrl || null,
      is_rte: !!isRte,
      is_maharashtrian: !!isMaharashtrian,
      admission_year: admissionYear || new Date().getFullYear(),
      status: status || 'Active',
      created_at: now,
      updated_at: now,
    }).returning('id');

    const student = await db('students').where({ id }).first();
    return res.status(201).json(serialize(student));
  } catch (err) {
    console.error('POST /api/students error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'A student with this roll number already exists in that class.' });
    }
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

const CAMEL_TO_SNAKE = {
  firstName: 'first_name', lastName: 'last_name', parentName: 'parent_name',
  parentMobile: 'parent_mobile', parentEmail: 'parent_email', photoUrl: 'photo_url',
  isRte: 'is_rte', isMaharashtrian: 'is_maharashtrian', admissionYear: 'admission_year',
  grade: 'grade', division: 'division', rollNo: 'roll_no', gender: 'gender',
  dob: 'dob', address: 'address', status: 'status',
  houseId: 'house_id', bloodGroup: 'blood_group', medicalConditions: 'medical_conditions',
  medicalNotes: 'medical_notes', transportRouteId: 'transport_route_id',
  previousSchoolName: 'previous_school_name', previousSchoolBoard: 'previous_school_board',
  previousGradeCompleted: 'previous_grade_completed', isTwinOf: 'is_twin_of',
  middleName: 'middle_name', religion: 'religion', caste: 'caste', subCaste: 'sub_caste',
  category: 'category', nationality: 'nationality', motherTongue: 'mother_tongue',
  birthPlace: 'birth_place', birthTaluka: 'birth_taluka', birthDistrict: 'birth_district',
  birthState: 'birth_state', nativeAddress: 'native_address', studentSaralNo: 'student_saral_no',
  grNo: 'gr_no', penNo: 'pen_no', aadharNumber: 'aadhar_number', apaarId: 'apaar_id',
  heightCm: 'height_cm', weightKg: 'weight_kg', studentEmail: 'student_email',
  studentMobile: 'student_mobile', handicapType: 'handicap_type', admissionDate: 'admission_date',
  previousSchoolPassYear: 'previous_school_pass_year', previousSchoolSeatNumber: 'previous_school_seat_number',
  previousSchoolPercentage: 'previous_school_percentage', previousSchoolLcNumber: 'previous_school_lc_number',
  previousSchoolLcDate: 'previous_school_lc_date', previousSchoolLeaveDate: 'previous_school_leave_date',
  previousSchoolRemarks: 'previous_school_remarks', previousSchoolReasonLeave: 'previous_school_reason_leave',
  previousSchoolMedium: 'previous_school_medium',
};

const JSON_BODY_FIELDS = { siblingsDeclared: 'siblings_declared' };

// PUT /api/students/:id
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = {};
    Object.entries(req.body).forEach(([key, value]) => {
      const column = CAMEL_TO_SNAKE[key];
      if (column) { updates[column] = value; return; }
      const jsonColumn = JSON_BODY_FIELDS[key];
      if (jsonColumn) updates[jsonColumn] = JSON.stringify(value || []);
    });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    updates.updated_at = new Date().toISOString();

    const count = await db('students').where({ id: req.params.id }).update(updates);
    if (!count) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    const student = await db('students').where({ id: req.params.id }).first();
    return res.json(serialize(student));
  } catch (err) {
    console.error('PUT /api/students/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('students').where({ id: req.params.id }).delete();
    if (!count) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json({ message: 'Student deleted.' });
  } catch (err) {
    console.error('DELETE /api/students/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students/:id/guardians (admin) — link a new or existing guardian
// (deduped by mobile, same as the admission-approval flow) to a student.
router.post('/:id/guardians', auth, authorize(['admin']), async (req, res) => {
  const {
    fullName, mobile, email, relation, isPrimary, isEmergencyContact, createParentLogin,
    qualification, occupation, officeAddress, contributionAreas,
  } = req.body;
  if (!fullName || !mobile) {
    return res.status(400).json({ message: 'fullName and mobile are required.' });
  }

  try {
    const result = await db.transaction(async (trx) => {
      const student = await trx('students').where({ id: req.params.id }).first();
      if (!student) {
        const err = new Error('Student not found.');
        err.status = 404;
        throw err;
      }

      let guardian = await trx('guardians').where({ mobile }).first();
      let guardianId;
      const now = new Date().toISOString();
      if (guardian) {
        guardianId = guardian.id;
      } else {
        const [inserted] = await trx('guardians').insert({
          full_name: fullName, mobile, email: email || null,
          qualification: qualification || null, occupation: occupation || null,
          office_address: officeAddress || null,
          contribution_areas: JSON.stringify(contributionAreas || []),
          created_at: now, updated_at: now,
        }).returning('id');
        guardianId = inserted.id;
        guardian = { id: guardianId, user_id: null };
      }

      let credentials = null;
      if (createParentLogin && !guardian.user_id) {
        const username = await generateUsername(trx, fullName);
        const tempPassword = generateTempPassword(fullName);
        const [{ id: userId }] = await trx('users').insert({
          username, role: 'parent', password: await bcrypt.hash(tempPassword, 12),
        }).returning('id');
        await trx('guardians').where({ id: guardianId }).update({ user_id: userId, updated_at: now });
        credentials = { username, tempPassword };
      }

      if (isPrimary) {
        await trx('student_guardians').where({ student_id: student.id }).update({ is_primary: false });
      }

      await trx('student_guardians').insert({
        student_id: student.id,
        guardian_id: guardianId,
        relation: ['Father', 'Mother', 'Guardian', 'Other'].includes(relation) ? relation : 'Guardian',
        is_primary: !!isPrimary,
        is_emergency_contact: !!isEmergencyContact,
      });

      if (isPrimary) await syncPrimaryGuardianSnapshot(student.id, trx);

      const guardianRow = await trx('guardians').where({ id: guardianId }).first();
      return { guardian: serializeRow(guardianRow, { jsonFields: ['contribution_areas'], jsonDefault: [] }), credentials };
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'This guardian is already linked to this student.' });
    }
    console.error('POST /api/students/:id/guardians error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students/:id/guardians/:guardianId/reset-password (admin) — no
// email infra exists yet, so this is the workaround for "forgot password":
// admin generates a fresh temp password and relays it directly.
router.post('/:id/guardians/:guardianId/reset-password', auth, authorize(['admin']), async (req, res) => {
  try {
    const guardian = await db('guardians').where({ id: req.params.guardianId }).first();
    if (!guardian) return res.status(404).json({ message: 'Guardian not found.' });
    if (!guardian.user_id) return res.status(409).json({ message: 'This guardian has no linked login to reset.' });

    const user = await db('users').where({ id: guardian.user_id }).first();
    const tempPassword = generateTempPassword(guardian.full_name);
    await db('users').where({ id: guardian.user_id }).update({ password: await bcrypt.hash(tempPassword, 12) });

    return res.json({ username: user.username, tempPassword });
  } catch (err) {
    console.error('POST /api/students/:id/guardians/:guardianId/reset-password error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/students/:id/guardians/:guardianId (admin) — unlink (the guardian
// row itself is kept in case it's shared with a sibling).
router.delete('/:id/guardians/:guardianId', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('student_guardians')
      .where({ student_id: req.params.id, guardian_id: req.params.guardianId }).delete();
    if (!count) return res.status(404).json({ message: 'Guardian link not found.' });
    await syncPrimaryGuardianSnapshot(req.params.id, db);
    return res.json({ message: 'Guardian unlinked.' });
  } catch (err) {
    console.error('DELETE /api/students/:id/guardians/:guardianId error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Parent self-service field classification (see migration 009 + the plan doc
// for the full rationale): identity/KYC fields go through admin approval
// instead of being writable here, even if a request tries to sneak them in.
const DIRECT_EDIT_FIELDS = [
  'gender', 'address', 'photoUrl', 'bloodGroup', 'medicalConditions', 'medicalNotes',
  'religion', 'caste', 'subCaste', 'category', 'nationality', 'motherTongue',
  'birthPlace', 'birthTaluka', 'birthDistrict', 'birthState', 'nativeAddress',
  'heightCm', 'weightKg', 'handicapType', 'studentEmail', 'studentMobile',
  'previousSchoolName', 'previousSchoolBoard', 'previousGradeCompleted',
  'previousSchoolPassYear', 'previousSchoolSeatNumber', 'previousSchoolPercentage',
  'previousSchoolLcNumber', 'previousSchoolLcDate', 'previousSchoolLeaveDate',
  'previousSchoolRemarks', 'previousSchoolReasonLeave', 'previousSchoolMedium',
];
const LOCKED_EDIT_FIELDS = ['firstName', 'middleName', 'lastName', 'dob', 'aadharNumber', 'apaarId', 'grNo', 'penNo', 'studentSaralNo'];
const GUARDIAN_SELF_FIELDS = { fullName: 'full_name', mobile: 'mobile', email: 'email', occupation: 'occupation', qualification: 'qualification', officeAddress: 'office_address', address: 'address' };

// PUT /api/students/:id/self (parent) — direct-edit fields only; anything
// else in the body (including locked/view-only columns) is silently ignored.
router.put('/:id/self', auth, async (req, res) => {
  try {
    const owns = await parentOwnsStudent(db, req.user.id, req.params.id);
    if (!owns) return res.status(403).json({ message: 'Not authorized for this student.' });

    const updates = {};
    Object.entries(req.body).forEach(([key, value]) => {
      if (key === 'siblingsDeclared') { updates.siblings_declared = JSON.stringify(value || []); return; }
      if (!DIRECT_EDIT_FIELDS.includes(key)) return;
      const column = CAMEL_TO_SNAKE[key];
      if (column) updates[column] = value;
    });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    updates.updated_at = new Date().toISOString();

    await db('students').where({ id: req.params.id }).update(updates);
    const student = await db('students').where({ id: req.params.id }).first();
    return res.json(serialize(student));
  } catch (err) {
    console.error('PUT /api/students/:id/self error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/students/:id/guardians/:guardianId/self (parent) — a guardian may
// only edit their own linked row, not a co-parent's.
router.put('/:id/guardians/:guardianId/self', auth, async (req, res) => {
  try {
    const guardian = await db('guardians').where({ id: req.params.guardianId }).first();
    if (!guardian) return res.status(404).json({ message: 'Guardian not found.' });
    if (guardian.user_id !== req.user.id) return res.status(403).json({ message: 'Not authorized for this guardian record.' });

    const updates = {};
    Object.entries(req.body).forEach(([key, value]) => {
      if (key === 'contributionAreas') { updates.contribution_areas = JSON.stringify(value || []); return; }
      const column = GUARDIAN_SELF_FIELDS[key];
      if (column) updates[column] = value;
    });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    updates.updated_at = new Date().toISOString();

    await db('guardians').where({ id: req.params.guardianId }).update(updates);

    const link = await db('student_guardians').where({ student_id: req.params.id, guardian_id: req.params.guardianId }).first();
    if (link && link.is_primary) await syncPrimaryGuardianSnapshot(req.params.id, db);

    const updated = await db('guardians').where({ id: req.params.guardianId }).first();
    return res.json(serializeRow(updated, { jsonFields: ['contribution_areas'], jsonDefault: [] }));
  } catch (err) {
    console.error('PUT /api/students/:id/guardians/:guardianId/self error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students/:id/edit-requests (parent) — locked-field changes or a
// document add/replace; notifies every admin. Applying the change is deferred
// to the approve step below, not done here.
router.post('/:id/edit-requests', auth, async (req, res) => {
  try {
    const owns = await parentOwnsStudent(db, req.user.id, req.params.id);
    if (!owns) return res.status(403).json({ message: 'Not authorized for this student.' });

    const { kind, changes, docType, fileUrl, originalFilename } = req.body;
    let payload;
    if (kind === 'fields') {
      const filtered = {};
      Object.entries(changes || {}).forEach(([key, value]) => {
        if (LOCKED_EDIT_FIELDS.includes(key)) filtered[key] = value;
      });
      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ message: 'No valid locked fields in changes.' });
      }
      payload = filtered;
    } else if (kind === 'document') {
      if (!fileUrl) return res.status(400).json({ message: 'fileUrl is required.' });
      payload = { docType: docType || 'Other', fileUrl, originalFilename: originalFilename || null };
    } else {
      return res.status(400).json({ message: 'kind must be "fields" or "document".' });
    }

    const now = new Date().toISOString();
    const [{ id }] = await db('student_edit_requests').insert({
      student_id: req.params.id, requested_by: req.user.id, kind,
      changes: JSON.stringify(payload), status: 'Pending', created_at: now,
    }).returning('id');

    const student = await db('students').where({ id: req.params.id }).first();
    const admins = await db('users').where({ role: 'admin' });
    await Promise.all(admins.map((admin) => db('notifications').insert({
      user_id: admin.id,
      title: 'New profile edit request',
      body: `${student.first_name} ${student.last_name} (${student.student_code}) has a pending ${kind === 'fields' ? 'field change' : 'document'} request.`,
      related_type: 'student_edit_request', related_id: id, created_at: now,
    })));

    const request = await db('student_edit_requests').where({ id }).first();
    return res.status(201).json(serializeRow(request, { jsonFields: ['changes'], jsonDefault: {} }));
  } catch (err) {
    console.error('POST /api/students/:id/edit-requests error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students/edit-requests/:id/approve (admin/principal)
router.post('/edit-requests/:id/approve', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const request = await db('student_edit_requests').where({ id: req.params.id }).first();
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'Pending') return res.status(409).json({ message: `Request already ${request.status}.` });

    const changes = JSON.parse(request.changes || '{}');
    const now = new Date().toISOString();

    if (request.kind === 'fields') {
      const updates = {};
      Object.entries(changes).forEach(([key, value]) => {
        if (!LOCKED_EDIT_FIELDS.includes(key)) return;
        const column = CAMEL_TO_SNAKE[key];
        if (column) updates[column] = value;
      });
      updates.updated_at = now;
      await db('students').where({ id: request.student_id }).update(updates);
    } else if (request.kind === 'document') {
      await db('documents').insert({
        owner_type: 'student', owner_id: request.student_id,
        doc_type: changes.docType || 'Other', file_url: changes.fileUrl,
        original_filename: changes.originalFilename || null,
        uploaded_by: request.requested_by, uploaded_at: now,
      });
    }

    await db('student_edit_requests').where({ id: req.params.id }).update({
      status: 'Approved', reviewed_by: req.user.id, reviewed_at: now,
    });

    await db('notifications').insert({
      user_id: request.requested_by,
      title: 'Profile edit request approved',
      body: `Your ${request.kind === 'fields' ? 'field change' : 'document'} request has been approved.`,
      related_type: 'student_edit_request', related_id: request.id, created_at: now,
    });

    const updated = await db('student_edit_requests').where({ id: req.params.id }).first();
    return res.json(serializeRow(updated, { jsonFields: ['changes'], jsonDefault: {} }));
  } catch (err) {
    console.error('POST /api/students/edit-requests/:id/approve error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students/edit-requests/:id/reject (admin/principal) — {note}
router.post('/edit-requests/:id/reject', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const request = await db('student_edit_requests').where({ id: req.params.id }).first();
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'Pending') return res.status(409).json({ message: `Request already ${request.status}.` });

    const { note } = req.body;
    const now = new Date().toISOString();
    await db('student_edit_requests').where({ id: req.params.id }).update({
      status: 'Rejected', admin_note: note || null, reviewed_by: req.user.id, reviewed_at: now,
    });

    await db('notifications').insert({
      user_id: request.requested_by,
      title: 'Profile edit request rejected',
      body: note ? `Your request was rejected: ${note}` : 'Your request was rejected.',
      related_type: 'student_edit_request', related_id: request.id, created_at: now,
    });

    const updated = await db('student_edit_requests').where({ id: req.params.id }).first();
    return res.json(serializeRow(updated, { jsonFields: ['changes'], jsonDefault: {} }));
  } catch (err) {
    console.error('POST /api/students/edit-requests/:id/reject error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
