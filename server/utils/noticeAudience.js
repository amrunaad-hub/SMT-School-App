// Resolves whether a notice's audience applies to a given user. The audience
// is an additive union of three independent facets — Grade×Division (reaches
// parents), Teachers (reaches teacher logins), and named Students (reaches
// those specific parents) — rather than a single mutually-exclusive mode, so
// there's no separate "commit" step that can be forgotten (the earlier
// mode-based funnel had exactly that failure: a grade+division selection
// that was never added to the array silently published to nobody).
const AUDIENCE_DEFAULT = {
  allGrades: false, grades: [],
  allDivisions: false, divisions: [],
  allTeachers: false, teacherIds: [],
  studentIds: [],
};

function normalizeAudience(targetAudience) {
  // Old funnel-shaped rows (mode: all|role|grade|house|gradeDivision|students)
  // are not translated — there was no real production data in that shape
  // (only 2 stale test notices), so they're treated as reaching nobody
  // rather than guessing at a mapping.
  if (!targetAudience || typeof targetAudience !== 'object' || Array.isArray(targetAudience) || targetAudience.mode) {
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
    .select('students.id', 'students.grade', 'students.division', 'students.house_id');
}

async function resolveTeacherStaffId(db, userId) {
  const staffRow = await db('staff').where({ user_id: userId }).first();
  return staffRow ? staffRow.id : null;
}

async function noticeAppliesToUser(db, notice, user) {
  const audience = normalizeAudience(notice.targetAudience !== undefined ? notice.targetAudience : notice.target_audience);

  if (user.role === 'teacher') {
    if (audience.allTeachers) return true;
    if (audience.teacherIds.length === 0) return false;
    const staffId = await resolveTeacherStaffId(db, user.id);
    return staffId !== null && audience.teacherIds.includes(staffId);
  }

  if (user.role === 'parent') {
    const children = await resolveChildren(db, user.id);
    if (children.length === 0) return false;
    return children.some((c) => {
      const byGradeDivision = (audience.allGrades || audience.grades.includes(c.grade))
        && (audience.allDivisions || audience.divisions.includes(c.division));
      const byStudentId = audience.studentIds.includes(c.id);
      return byGradeDivision || byStudentId;
    });
  }

  return false;
}

// Size of a notice's resolved audience, computed via SQL aggregates rather
// than looping every user through noticeAppliesToUser (which would be
// O(users) per notice) — cheap enough to show eagerly in the admin list.
async function resolveReachCount(db, targetAudience) {
  const audience = normalizeAudience(targetAudience);
  const gradeDivisionActive = audience.allGrades || audience.grades.length > 0;
  const hasStudentIds = audience.studentIds.length > 0;

  let parentCount = 0;
  if (gradeDivisionActive || hasStudentIds) {
    const row = await db('student_guardians')
      .join('students', 'students.id', 'student_guardians.student_id')
      .join('guardians', 'guardians.id', 'student_guardians.guardian_id')
      .whereNotNull('guardians.user_id')
      .where((qb) => {
        if (gradeDivisionActive) {
          qb.orWhere((gb) => {
            if (!audience.allGrades) gb.whereIn('students.grade', audience.grades);
            if (!audience.allDivisions) gb.whereIn('students.division', audience.divisions);
          });
        }
        if (hasStudentIds) qb.orWhereIn('students.id', audience.studentIds);
      })
      .countDistinct({ count: 'guardians.user_id' })
      .first();
    parentCount = Number(row?.count || 0);
  }

  let teacherCount = 0;
  if (audience.allTeachers) {
    const row = await db('staff').whereNotNull('user_id').count({ count: '*' }).first();
    teacherCount = Number(row?.count || 0);
  } else if (audience.teacherIds.length > 0) {
    const row = await db('staff').whereNotNull('user_id').whereIn('id', audience.teacherIds).count({ count: '*' }).first();
    teacherCount = Number(row?.count || 0);
  }

  return parentCount + teacherCount;
}

module.exports = { noticeAppliesToUser, normalizeAudience, resolveReachCount, AUDIENCE_DEFAULT };
