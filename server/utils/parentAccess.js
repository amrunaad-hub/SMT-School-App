// Whether the given user is a guardian linked to the given student — the
// ownership check that gates every parent self-service route on a student
// record (profile view, direct edits, edit requests).
async function parentOwnsStudent(db, userId, studentId) {
  const link = await db('guardians')
    .join('student_guardians', 'student_guardians.guardian_id', 'guardians.id')
    .where({ 'guardians.user_id': userId, 'student_guardians.student_id': studentId })
    .first();
  return !!link;
}

module.exports = { parentOwnsStudent };
