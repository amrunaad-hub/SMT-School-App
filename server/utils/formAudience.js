// Resolves whether a Form applies to a given parent/teacher, reusing the
// exact grade/division matching Notices already established (see
// server/utils/noticeAudience.js) rather than a second implementation. A
// Form's audience is deliberately simpler than a Notice's: one grade/division
// picker plus a target_parents/target_teachers role toggle, no separate
// named-teacher or named-student facets.
const { matchesGradeDivision } = require('./noticeAudience');
const { teacherCanAccessGrade } = require('./classAccess');

const AUDIENCE_DEFAULT = { allGrades: false, gradeSelections: [], grades: [], allDivisions: false, divisions: [] };

function normalizeFormAudience(targetAudience) {
  if (!targetAudience || typeof targetAudience !== 'object' || Array.isArray(targetAudience)) {
    return { ...AUDIENCE_DEFAULT };
  }
  return { ...AUDIENCE_DEFAULT, ...targetAudience };
}

async function resolveChildren(db, userId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return [];
  return db('student_guardians')
    .join('students', 'students.id', 'student_guardians.student_id')
    .where({ 'student_guardians.guardian_id': guardian.id })
    .select('students.id', 'students.grade', 'students.division');
}

async function formAppliesToUser(db, form, user) {
  if (!form.isActive) return false;
  const audience = normalizeFormAudience(form.targetAudience !== undefined ? form.targetAudience : form.target_audience);

  if (user.role === 'teacher') {
    if (!form.targetTeachers) return false;
    if (audience.allGrades) return true;
    for (const gs of audience.gradeSelections) {
      if (await teacherCanAccessGrade(db, user.id, gs.grade)) return true;
    }
    return false;
  }

  if (user.role === 'parent') {
    if (!form.targetParents) return false;
    const children = await resolveChildren(db, user.id);
    if (children.length === 0) return false;
    return children.some((c) => matchesGradeDivision(audience, c.grade, c.division));
  }

  return false;
}

module.exports = { formAppliesToUser, normalizeFormAudience, AUDIENCE_DEFAULT };
