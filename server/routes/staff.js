const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow, serializeRows } = require('../utils/serialize');
const { generateUsername, generateTempPassword } = require('../utils/credentials');

const JSON_FIELDS = ['assigned_subjects', 'compensation', 'roles'];
const BOOL_FIELDS = ['is_maharashtrian', 'is_brahmin'];
const serialize = (row, opts = {}) => serializeRow(row, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, jsonDefault: [], ...opts });

const CAMEL_TO_SNAKE = {
  staffCode: 'staff_code', displayName: 'display_name', firstName: 'first_name', lastName: 'last_name',
  gender: 'gender', category: 'category', department: 'department', role: 'role',
  qualification: 'qualification', joiningDate: 'joining_date', phone: 'phone', email: 'email',
  photoUrl: 'photo_url', isMaharashtrian: 'is_maharashtrian', isBrahmin: 'is_brahmin',
  experienceYearsPrior: 'experience_years_prior', experienceYearsCurrentSchool: 'experience_years_current_school',
  classesTakenTotal: 'classes_taken_total', classesTakenYtd: 'classes_taken_ytd', status: 'status',
  houseId: 'house_id', emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone', emergencyContactRelation: 'emergency_contact_relation',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    if (key === 'assignedSubjects') { row.assigned_subjects = JSON.stringify(value || []); return; }
    if (key === 'compensation') { row.compensation = JSON.stringify(value || {}); return; }
    if (key === 'roles') { row.roles = JSON.stringify(value || []); return; }
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = (key === 'isMaharashtrian' || key === 'isBrahmin') ? (value ? 1 : 0) : value;
  });
  return row;
}

const DIVISIONS = ['alpha', 'beta', 'gamma'];

// GET /api/staff
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, department } = req.query;
    let query = db('staff');

    if (category && category !== 'all') query = query.where({ category });
    if (department && department !== 'all') query = query.whereRaw('department LIKE ? COLLATE NOCASE', [`%${department}%`]);
    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('display_name LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('staff_code LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('role LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('department LIKE ? COLLATE NOCASE', [keyword])
          .orWhereRaw('assigned_subjects LIKE ? COLLATE NOCASE', [keyword]);
      });
    }

    const rows = await query.orderBy([{ column: 'category' }, { column: 'staff_code' }]);
    const staffIds = rows.map((r) => r.id);
    const [assignments, classTeacherRows] = staffIds.length
      ? await Promise.all([
        db('staff_class_assignments').whereIn('staff_id', staffIds),
        db('class_teacher_history').whereIn('staff_id', staffIds).where({ unassigned_at: null }),
      ])
      : [[], []];
    const assignmentsByStaff = {};
    assignments.forEach((a) => { (assignmentsByStaff[a.staff_id] ||= []).push(serializeRow(a)); });
    const classTeacherByStaff = {};
    classTeacherRows.forEach((c) => { (classTeacherByStaff[c.staff_id] ||= []).push(serializeRow(c)); });

    const staff = serializeRows(rows, { jsonFields: JSON_FIELDS, boolFields: BOOL_FIELDS, jsonDefault: [] })
      .map((s) => ({ ...s, classAssignments: assignmentsByStaff[s.id] || [], currentClassTeacherOf: classTeacherByStaff[s.id] || [] }));
    return res.json({ staff, total: staff.length });
  } catch (err) {
    console.error('GET /api/staff error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/staff/class-teachers — school-wide grade+division -> current class
// teacher lookup. Registered before /:code so it isn't swallowed as a staff code.
router.get('/class-teachers', auth, async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const rows = await db('class_teacher_history')
      .join('staff', 'staff.id', 'class_teacher_history.staff_id')
      .where({ 'class_teacher_history.academic_year': academicYear, 'class_teacher_history.unassigned_at': null })
      .select('class_teacher_history.grade', 'class_teacher_history.division', 'staff.staff_code', 'staff.display_name');
    return res.json({ classTeachers: rows.map((r) => ({ grade: r.grade, division: r.division, staffCode: r.staff_code, displayName: r.display_name })) });
  } catch (err) {
    console.error('GET /api/staff/class-teachers error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/staff/:code
router.get('/:code', auth, async (req, res) => {
  try {
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const [classAssignments, currentClassTeacherOf, house] = await Promise.all([
      db('staff_class_assignments').where({ staff_id: staffMember.id }),
      db('class_teacher_history').where({ staff_id: staffMember.id, unassigned_at: null }),
      staffMember.house_id ? db('houses').where({ id: staffMember.house_id }).first() : null,
    ]);

    return res.json({
      ...serialize(staffMember),
      house: house ? serializeRow(house) : null,
      hasLogin: !!staffMember.user_id,
      classAssignments: classAssignments.map((c) => serializeRow(c)),
      currentClassTeacherOf: currentClassTeacherOf.map((c) => serializeRow(c)),
    });
  } catch (err) {
    console.error('GET /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const row = { ...bodyToRow(req.body), created_at: now, updated_at: now };
    const [id] = await db('staff').insert(row);
    const staffMember = await db('staff').where({ id }).first();
    return res.status(201).json(serialize(staffMember));
  } catch (err) {
    console.error('POST /api/staff error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Staff code already exists.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/:code
router.put('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('staff').where({ staff_code: req.params.code }).update(updates);
    if (!count) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    return res.json(serialize(staffMember));
  } catch (err) {
    console.error('PUT /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:code
router.delete('/:code', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('staff').where({ staff_code: req.params.code }).delete();
    if (!count) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    return res.json({ message: 'Staff member deleted.' });
  } catch (err) {
    console.error('DELETE /api/staff/:code error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff/:code/class-assignments (admin) — assign a teacher to teach a
// grade+division.
router.post('/:code/class-assignments', auth, authorize(['admin']), async (req, res) => {
  try {
    const { grade, division, academicYear = '2025-26' } = req.body;
    if (!grade || !division) return res.status(400).json({ message: 'grade and division are required.' });
    if (!DIVISIONS.includes(String(division).toLowerCase())) return res.status(400).json({ message: 'Invalid division.' });

    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });

    const [id] = await db('staff_class_assignments').insert({
      staff_id: staffMember.id, grade: Number(grade), division: String(division).toLowerCase(), academic_year: academicYear,
    });
    const row = await db('staff_class_assignments').where({ id }).first();
    return res.status(201).json(serializeRow(row));
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'This teacher is already assigned to that class.' });
    }
    console.error('POST /api/staff/:code/class-assignments error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:code/class-assignments/:id (admin)
router.delete('/:code/class-assignments/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('staff_class_assignments').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Class assignment not found.' });
    return res.json({ message: 'Class assignment removed.' });
  } catch (err) {
    console.error('DELETE /api/staff/:code/class-assignments/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff/:code/class-teacher (admin) — assign (or reassign) this teacher
// as the official class teacher of a grade+division. If someone else currently
// holds that designation, their history row is closed out (unassigned_at set)
// rather than deleted, so the reassignment stays auditable. Also ensures a
// matching teaching assignment exists (being class teacher implies teaching it).
router.post('/:code/class-teacher', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { grade, division, academicYear = '2025-26' } = req.body;
    if (!grade || !division) return res.status(400).json({ message: 'grade and division are required.' });
    const divisionLower = String(division).toLowerCase();

    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });

    const result = await db.transaction(async (trx) => {
      await trx('class_teacher_history')
        .where({ grade: Number(grade), division: divisionLower, academic_year: academicYear, unassigned_at: null })
        .update({ unassigned_at: new Date().toISOString() });

      const [id] = await trx('class_teacher_history').insert({
        grade: Number(grade), division: divisionLower, academic_year: academicYear,
        staff_id: staffMember.id, assigned_by: typeof req.user.id === 'number' ? req.user.id : null,
      });

      const existingAssignment = await trx('staff_class_assignments')
        .where({ staff_id: staffMember.id, grade: Number(grade), division: divisionLower, academic_year: academicYear }).first();
      if (!existingAssignment) {
        await trx('staff_class_assignments').insert({ staff_id: staffMember.id, grade: Number(grade), division: divisionLower, academic_year: academicYear });
      }

      return trx('class_teacher_history').where({ id }).first();
    });

    return res.status(201).json(serializeRow(result));
  } catch (err) {
    console.error('POST /api/staff/:code/class-teacher error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:code/class-teacher (admin) — vacate this teacher's current
// class-teacher designation (e.g. they're leaving, without a replacement yet).
router.delete('/:code/class-teacher', auth, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });

    const count = await db('class_teacher_history')
      .where({ staff_id: staffMember.id, unassigned_at: null })
      .update({ unassigned_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ message: 'This teacher is not currently a class teacher of any grade/division.' });
    return res.json({ message: 'Class teacher designation vacated.' });
  } catch (err) {
    console.error('DELETE /api/staff/:code/class-teacher error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff/:code/link-login (admin) — link an existing users row by
// username, or create a new one if `username` isn't provided. Same one-time
// temp-password pattern as the Module 1 admission-approve flow.
router.post('/:code/link-login', auth, authorize(['admin']), async (req, res) => {
  try {
    const { username, role = 'teacher' } = req.body;
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });
    if (staffMember.user_id) return res.status(409).json({ message: 'This staff member already has a linked login.' });

    if (username) {
      const existingUser = await db('users').where({ username }).first();
      if (!existingUser) return res.status(404).json({ message: `No user found with username "${username}".` });
      await db('staff').where({ id: staffMember.id }).update({ user_id: existingUser.id, updated_at: new Date().toISOString() });
      return res.json({ linked: { username: existingUser.username, role: existingUser.role } });
    }

    const generatedUsername = await generateUsername(db, staffMember.display_name);
    const tempPassword = generateTempPassword(staffMember.display_name);
    const [userId] = await db('users').insert({
      username: generatedUsername, role, password: await bcrypt.hash(tempPassword, 12),
    });
    await db('staff').where({ id: staffMember.id }).update({ user_id: userId, updated_at: new Date().toISOString() });
    return res.status(201).json({ created: { username: generatedUsername, tempPassword } });
  } catch (err) {
    console.error('POST /api/staff/:code/link-login error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff/:code/reset-password (admin) — no email infra exists yet, so
// this is the workaround for "forgot password": admin generates a fresh temp
// password and relays it directly, same one-time-shown pattern as link-login.
router.post('/:code/reset-password', auth, authorize(['admin']), async (req, res) => {
  try {
    const staffMember = await db('staff').where({ staff_code: req.params.code }).first();
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });
    if (!staffMember.user_id) return res.status(409).json({ message: 'This staff member has no linked login to reset.' });

    const user = await db('users').where({ id: staffMember.user_id }).first();
    const tempPassword = generateTempPassword(staffMember.display_name);
    await db('users').where({ id: staffMember.user_id }).update({ password: await bcrypt.hash(tempPassword, 12) });

    return res.json({ username: user.username, tempPassword });
  } catch (err) {
    console.error('POST /api/staff/:code/reset-password error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
