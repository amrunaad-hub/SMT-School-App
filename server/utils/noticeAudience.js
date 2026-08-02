// Resolves whether a notice's funnel-targeted audience applies to a given
// user. Old-shape rows (target_audience was a flat array of role tags before
// migration 008) are normalized to { mode: 'role', roles: [...] } so nothing
// breaks if one slipped through.
function normalizeAudience(targetAudience) {
  if (Array.isArray(targetAudience)) {
    return { mode: 'role', roles: targetAudience, grades: [], houseIds: [], gradeDivisions: [], studentIds: [] };
  }
  return {
    mode: 'all', roles: [], grades: [], houseIds: [], gradeDivisions: [],
    studentIds: [], ...(targetAudience || {}),
  };
}

async function resolveChildren(db, userId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return [];
  return db('student_guardians')
    .join('students', 'students.id', 'student_guardians.student_id')
    .where({ 'student_guardians.guardian_id': guardian.id })
    .select('students.id', 'students.grade', 'students.division', 'students.house_id');
}

async function noticeAppliesToUser(db, notice, user) {
  const audience = normalizeAudience(notice.targetAudience !== undefined ? notice.targetAudience : notice.target_audience);

  if (audience.mode === 'all') return true;
  if (audience.mode === 'role') {
    if (audience.roles.includes('all')) return true;
    return audience.roles.includes(user.role);
  }

  // Remaining modes (grade/house/gradeDivision/students) resolve against the
  // requesting user's linked children — meaningful for parents today.
  if (user.role !== 'parent') return false;
  const children = await resolveChildren(db, user.id);
  if (children.length === 0) return false;

  if (audience.mode === 'grade') {
    return children.some((c) => audience.grades.includes(c.grade));
  }
  if (audience.mode === 'house') {
    return children.some((c) => c.house_id && audience.houseIds.includes(c.house_id));
  }
  if (audience.mode === 'gradeDivision') {
    return children.some((c) => audience.gradeDivisions.some((gd) => gd.grade === c.grade && gd.division === c.division));
  }
  if (audience.mode === 'students') {
    return children.some((c) => audience.studentIds.includes(c.id));
  }
  return false;
}

module.exports = { noticeAppliesToUser, normalizeAudience };
