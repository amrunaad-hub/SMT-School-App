// Resolves whether a logged-in teacher may act on a given grade (attendance,
// period notes). Division is deliberately ignored: a class teacher's own
// staff_class_assignments/class_teacher_history row is already scoped to
// their own division, so checking "any row matching this grade" is what lets
// a class teacher cover a colleague's division of the SAME grade without a
// schema change or an explicit "covering teacher" grant table.
async function teacherCanAccessGrade(db, userId, grade) {
  if (typeof userId !== 'number') return false;
  const staffMember = await db('staff').where({ user_id: userId }).first();
  if (!staffMember) return false;

  const gradeNum = Number(grade);
  const [assignment, classTeacherOf] = await Promise.all([
    db('staff_class_assignments').where({ staff_id: staffMember.id, grade: gradeNum }).first(),
    db('class_teacher_history').where({ staff_id: staffMember.id, grade: gradeNum, unassigned_at: null }).first(),
  ]);
  return !!(assignment || classTeacherOf);
}

async function isParentOfStudent(db, userId, studentId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return false;
  const link = await db('student_guardians').where({ guardian_id: guardian.id, student_id: studentId }).first();
  return !!link;
}

module.exports = { teacherCanAccessGrade, isParentOfStudent };
