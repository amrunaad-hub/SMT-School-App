// Resolves whether a Form applies to a given parent/teacher. Forms now use
// the exact same audience shape/semantics as Notices (see
// server/utils/noticeAudience.js) — grade/division selection always reaches
// parents directly (no separate "target parents" flag), Teachers is an
// independent facet (allTeachers/teacherIds), and Specific Students is a
// third independent facet — rather than a second, parallel implementation.
const { matchesGradeDivision, normalizeAudience } = require('./noticeAudience');

async function resolveChildren(db, userId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return [];
  return db('student_guardians')
    .join('students', 'students.id', 'student_guardians.student_id')
    .where({ 'student_guardians.guardian_id': guardian.id })
    .select('students.id', 'students.grade', 'students.division');
}

async function resolveTeacherStaffId(db, userId) {
  const staffRow = await db('staff').where({ user_id: userId }).first();
  return staffRow ? staffRow.id : null;
}

async function formAppliesToUser(db, form, user) {
  if (!form.isActive) return false;
  const audience = normalizeAudience(form.targetAudience !== undefined ? form.targetAudience : form.target_audience);

  if (user.role === 'teacher') {
    if (audience.allTeachers) return true;
    if (audience.teacherIds.length === 0) return false;
    const staffId = await resolveTeacherStaffId(db, user.id);
    return staffId !== null && audience.teacherIds.includes(staffId);
  }

  if (user.role === 'parent') {
    const children = await resolveChildren(db, user.id);
    if (children.length === 0) return false;
    return children.some((c) => matchesGradeDivision(audience, c.grade, c.division) || audience.studentIds.includes(c.id));
  }

  return false;
}

module.exports = { formAppliesToUser };
