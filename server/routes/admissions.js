const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { generateUsername, generateTempPassword } = require('../utils/credentials');
const { validatePublicSubmitMandatory, validateApproveMandatory, guardiansFromInput } = require('../utils/validateAdmissionMandatory');

const JSON_FIELDS = ['guardians_draft', 'siblings_declared'];
const serialize = (row) => serializeRow(row, { jsonFields: JSON_FIELDS, jsonDefault: [] });

// Columns staged on `admissions` (public form) that get copied verbatim onto
// the new `students` row at approve time — personal/identity + extended
// previous-school detail. Kept as one list instead of hand-copying ~30 fields.
const ADMISSION_TO_STUDENT_FIELDS = [
  'middle_name', 'religion', 'caste', 'sub_caste', 'category', 'nationality', 'mother_tongue',
  'birth_place', 'birth_taluka', 'birth_district', 'birth_state', 'native_address',
  'student_saral_no', 'gr_no', 'pen_no', 'aadhar_number', 'apaar_id', 'height_cm', 'weight_kg',
  'student_email', 'student_mobile', 'handicap_type', 'siblings_declared', 'gender',
  'previous_school_board', 'previous_school_pass_year', 'previous_school_seat_number',
  'previous_school_percentage', 'previous_school_lc_number', 'previous_school_lc_date',
  'previous_school_leave_date', 'previous_school_remarks', 'previous_school_reason_leave',
  'previous_school_medium',
];

const OPEN_STATUSES = ['Enquiry', 'In Process', 'Document Verification', 'Clarification Requested'];

const generateStudentCode = (grade, division, rollNo) =>
  `G${grade}-${String(division).toUpperCase()}-${String(rollNo).padStart(3, '0')}`;

async function logStatusChange(admissionId, fromStatus, toStatus, changedBy, note) {
  await db('admission_status_log').insert({
    admission_id: admissionId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: typeof changedBy === 'number' ? changedBy : null,
    note: note || null,
  });
}

const CAMEL_TO_SNAKE = {
  childName: 'child_name', dob: 'dob', currentSchool: 'current_school',
  applyingForGrade: 'applying_for_grade', enquiryType: 'enquiry_type', area: 'area',
  parentName: 'parent_name', parentMobile: 'parent_mobile', parentEmail: 'parent_email',
  source: 'source', status: 'status', followUpNote: 'follow_up_note',
  rejectionReason: 'rejection_reason', assignedTo: 'assigned_to', academicYear: 'academic_year',
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
  admissionFormNo: 'admission_form_no', admissionDate: 'admission_date',
};

const JSON_BODY_FIELDS = { guardiansDraft: 'guardians_draft', siblingsDeclared: 'siblings_declared' };

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) { row[column] = value; return; }
    const jsonColumn = JSON_BODY_FIELDS[key];
    if (jsonColumn) row[jsonColumn] = JSON.stringify(value || []);
  });
  return row;
}

// Auto-generate enquiryCode
const generateEnquiryCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `ENQ-${year}-`;
  const last = await db('admissions').where('enquiry_code', 'like', `${prefix}%`).orderBy('enquiry_code', 'desc').first();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.enquiry_code.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/admissions
router.get('/', auth, async (req, res) => {
  try {
    const { status, grade, search, academicYear } = req.query;
    let query = db('admissions');
    if (status && status !== 'all') query = query.where({ status });
    if (grade && grade !== 'all') query = query.where({ applying_for_grade: Number(grade) });
    if (academicYear) query = query.where({ academic_year: academicYear });
    if (search && search.trim()) {
      const kw = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('child_name LIKE ? COLLATE NOCASE', [kw])
          .orWhereRaw('parent_name LIKE ? COLLATE NOCASE', [kw])
          .orWhereRaw('enquiry_code LIKE ? COLLATE NOCASE', [kw]);
      });
    }

    const rows = await query.orderBy('created_at', 'desc');
    const admissions = serializeRows(rows);
    const total = admissions.length;

    // Compute stats
    let allQuery = db('admissions');
    if (academicYear) allQuery = allQuery.where({ academic_year: academicYear });
    const allRows = await allQuery;
    const all = serializeRows(allRows);

    const stats = {
      totalEnquiries: all.length,
      enquiries: all.filter((a) => a.status === 'Enquiry').length,
      inProcess: all.filter((a) => ['In Process', 'Document Verification'].includes(a.status)).length,
      confirmed: all.filter((a) => a.status === 'Confirmed').length,
      rejected: all.filter((a) => a.status === 'Rejected').length,
      byGrade: {},
    };

    all.forEach((a) => {
      const gk = `Grade ${a.applyingForGrade}`;
      if (!stats.byGrade[gk]) {
        stats.byGrade[gk] = { grade: gk, enquiries: 0, inProcess: 0, confirmed: 0, rejected: 0 };
      }
      stats.byGrade[gk].enquiries++;
      if (['In Process', 'Document Verification'].includes(a.status)) stats.byGrade[gk].inProcess++;
      if (a.status === 'Confirmed') stats.byGrade[gk].confirmed++;
      if (a.status === 'Rejected') stats.byGrade[gk].rejected++;
    });

    stats.byGrade = Object.values(stats.byGrade);

    return res.json({ admissions, total, stats });
  } catch (err) {
    console.error('GET /api/admissions error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admissions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const admission = await db('admissions').where({ id: req.params.id }).first();
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });

    const [documents, statusLog] = await Promise.all([
      db('documents').where({ owner_type: 'admission', owner_id: admission.id }).orderBy('uploaded_at', 'desc'),
      db('admission_status_log').where({ admission_id: admission.id }).orderBy('changed_at', 'asc'),
    ]);

    let guardians = [];
    if (admission.student_id) {
      guardians = await db('student_guardians')
        .join('guardians', 'guardians.id', 'student_guardians.guardian_id')
        .where({ 'student_guardians.student_id': admission.student_id })
        .select('guardians.*', 'student_guardians.relation', 'student_guardians.is_primary', 'student_guardians.is_emergency_contact');
    }

    return res.json({
      ...serialize(admission),
      documents: serializeRows(documents),
      statusLog: serializeRows(statusLog),
      guardians: serializeRows(guardians, { boolFields: ['is_primary', 'is_emergency_contact'] }),
    });
  } catch (err) {
    console.error('GET /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions
router.post('/', auth, async (req, res) => {
  try {
    const enquiryCode = await generateEnquiryCode();
    const now = new Date().toISOString();
    const [id] = await db('admissions').insert({
      ...bodyToRow(req.body), enquiry_code: enquiryCode, created_at: now, updated_at: now,
    });
    const admission = await db('admissions').where({ id }).first();
    return res.status(201).json(serialize(admission));
  } catch (err) {
    console.error('POST /api/admissions error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate enquiry code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admissions/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('admissions').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Admission record not found.' });
    const admission = await db('admissions').where({ id: req.params.id }).first();
    return res.json(serialize(admission));
  } catch (err) {
    console.error('PUT /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admissions/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('admissions').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Admission record not found.' });
    return res.json({ message: 'Admission record deleted.' });
  } catch (err) {
    console.error('DELETE /api/admissions/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions/:id/approve (admin) — converts an enquiry into a real
// enrolled student: assigns grade/division/roll/house, creates/links guardians
// (deduped by mobile so siblings share a guardian record), optionally creates a
// parent login (no SMS/email infra yet, so the temp password is returned once
// for the admin to relay manually), and marks the admission Confirmed.
router.post('/:id/approve', auth, authorize(['admin']), async (req, res) => {
  const {
    grade, division, rollNo, houseId, guardians, createParentLogin = true,
    admissionFormNo, admissionDate,
  } = req.body;

  if (!grade || !division) {
    return res.status(400).json({ message: 'grade and division are required.' });
  }

  try {
    const result = await db.transaction(async (trx) => {
      const admission = await trx('admissions').where({ id: req.params.id }).first();
      if (!admission) {
        const err = new Error('Admission record not found.');
        err.status = 404;
        throw err;
      }
      if (!OPEN_STATUSES.includes(admission.status)) {
        const err = new Error(`Cannot approve an admission with status "${admission.status}".`);
        err.status = 409;
        throw err;
      }

      const missing = validateApproveMandatory({ admissionFormNo, admissionDate, guardians, admission });
      if (missing.length) {
        const err = new Error(`Missing required field(s): ${missing.join(', ')}.`);
        err.status = 400;
        throw err;
      }

      const gradeNum = Number(grade);
      const divisionLower = String(division).toLowerCase();

      let assignedRollNo = rollNo;
      if (!assignedRollNo) {
        const lastStudent = await trx('students')
          .where({ grade: gradeNum, division: divisionLower })
          .orderBy('roll_no', 'desc').first();
        assignedRollNo = lastStudent ? lastStudent.roll_no + 1 : 1;
      }

      const guardianInputs = guardiansFromInput({ guardians, guardiansDraft: admission.guardians_draft }).length
        ? guardiansFromInput({ guardians, guardiansDraft: admission.guardians_draft })
        : [{
          fullName: admission.parent_name,
          mobile: admission.parent_mobile,
          email: admission.parent_email,
          relation: 'Guardian',
          isPrimary: true,
          isEmergencyContact: true,
        }];

      const primaryGuardianInput = guardianInputs.find((g) => g.isPrimary) || guardianInputs[0];

      const nameParts = String(admission.child_name).trim().split(/\s+/);
      const now = new Date().toISOString();

      const copiedFields = {};
      ADMISSION_TO_STUDENT_FIELDS.forEach((f) => { copiedFields[f] = admission[f] ?? null; });

      const [studentId] = await trx('students').insert({
        ...copiedFields,
        student_code: generateStudentCode(gradeNum, divisionLower, assignedRollNo),
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
        grade: gradeNum,
        division: divisionLower,
        roll_no: Number(assignedRollNo),
        dob: admission.dob || null,
        parent_name: primaryGuardianInput?.fullName || null,
        parent_mobile: primaryGuardianInput?.mobile || null,
        parent_email: primaryGuardianInput?.email || null,
        house_id: houseId || null,
        previous_school_name: admission.current_school || null,
        admission_id: admission.id,
        admission_date: admissionDate,
        admission_year: new Date(admissionDate).getFullYear() || new Date().getFullYear(),
        status: 'Active',
        created_at: now,
        updated_at: now,
      });

      const generatedCredentials = [];

      for (const g of guardianInputs) {
        if (!g.mobile) continue; // skip malformed entries rather than failing the whole approval

        let guardian = await trx('guardians').where({ mobile: g.mobile }).first();
        let guardianId;
        if (guardian) {
          guardianId = guardian.id;
        } else {
          [guardianId] = await trx('guardians').insert({
            full_name: g.fullName || 'Guardian',
            mobile: g.mobile,
            email: g.email || null,
            qualification: g.qualification || null,
            occupation: g.occupation || null,
            office_address: g.officeAddress || null,
            contribution_areas: JSON.stringify(g.contributionAreas || []),
            created_at: now,
            updated_at: now,
          });
          guardian = { id: guardianId, user_id: null };
        }

        if (createParentLogin && !guardian.user_id) {
          const username = await generateUsername(trx, g.mobile);
          const tempPassword = generateTempPassword();
          const [userId] = await trx('users').insert({
            username,
            role: 'parent',
            password: await bcrypt.hash(tempPassword, 12),
          });
          await trx('guardians').where({ id: guardianId }).update({ user_id: userId, updated_at: now });
          generatedCredentials.push({ guardianName: g.fullName, username, tempPassword });
        }

        await trx('student_guardians').insert({
          student_id: studentId,
          guardian_id: guardianId,
          relation: ['Father', 'Mother', 'Guardian', 'Other'].includes(g.relation) ? g.relation : 'Guardian',
          is_primary: !!g.isPrimary,
          is_emergency_contact: !!g.isEmergencyContact,
        });
      }

      await trx('admissions').where({ id: admission.id }).update({
        status: 'Confirmed', student_id: studentId, updated_at: now,
      });
      await trx('admission_status_log').insert({
        admission_id: admission.id, from_status: admission.status, to_status: 'Confirmed',
        changed_by: typeof req.user.id === 'number' ? req.user.id : null,
      });

      const student = await trx('students').where({ id: studentId }).first();
      return { student: serialize(student), generatedCredentials };
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('POST /api/admissions/:id/approve error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions/:id/reject (admin)
router.post('/:id/reject', auth, authorize(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    const admission = await db('admissions').where({ id: req.params.id }).first();
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    if (!OPEN_STATUSES.includes(admission.status)) {
      return res.status(409).json({ message: `Cannot reject an admission with status "${admission.status}".` });
    }

    await db('admissions').where({ id: admission.id }).update({
      status: 'Rejected', rejection_reason: reason || null, updated_at: new Date().toISOString(),
    });
    await logStatusChange(admission.id, admission.status, 'Rejected', req.user.id, reason);

    const updated = await db('admissions').where({ id: admission.id }).first();
    return res.json(serialize(updated));
  } catch (err) {
    console.error('POST /api/admissions/:id/reject error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admissions/:id/request-clarification (admin)
router.post('/:id/request-clarification', auth, authorize(['admin']), async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'A clarification note is required.' });
    }
    const admission = await db('admissions').where({ id: req.params.id }).first();
    if (!admission) return res.status(404).json({ message: 'Admission record not found.' });
    if (!OPEN_STATUSES.includes(admission.status)) {
      return res.status(409).json({ message: `Cannot request clarification on an admission with status "${admission.status}".` });
    }

    await db('admissions').where({ id: admission.id }).update({
      status: 'Clarification Requested', follow_up_note: note.trim(), updated_at: new Date().toISOString(),
    });
    await logStatusChange(admission.id, admission.status, 'Clarification Requested', req.user.id, note.trim());

    const updated = await db('admissions').where({ id: admission.id }).first();
    return res.json(serialize(updated));
  } catch (err) {
    console.error('POST /api/admissions/:id/request-clarification error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
