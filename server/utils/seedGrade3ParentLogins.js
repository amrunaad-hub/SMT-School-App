// One-off maintenance script: creates parent-role login accounts linked to
// every real Grade 3 student across all divisions (alpha/beta/gamma), for
// manual QA of the parent dashboard against actual student data instead of
// the generic parent/parent demo account. Idempotent — safe to re-run.
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { encryptText } = require('./crypto');

const DIVISIONS = ['alpha', 'beta', 'gamma'];

async function run() {
  const results = [];

  for (const division of DIVISIONS) {
    const students = await db('students')
      .where({ grade: 3, division, status: 'Active' })
      .orderBy('roll_no', 'asc');

    for (const student of students) {
      const primaryLink = await db('student_guardians')
        .where({ student_id: student.id, is_primary: true })
        .first();
      const link = primaryLink || await db('student_guardians').where({ student_id: student.id }).first();
      if (!link) {
        console.log(`[seedGrade3ParentLogins] No guardian found for ${student.student_code}, skipping`);
        continue;
      }
      const guardian = await db('guardians').where({ id: link.guardian_id }).first();

      const username = `g3${division}${student.roll_no}`;
      const password = username;
      const passwordHash = await bcrypt.hash(password, 12);

      const existingUser = await db('users').where({ username }).first();
      let userId;
      if (existingUser) {
        userId = existingUser.id;
        await db('users').where({ id: userId }).update({ password: passwordHash, role: 'parent' });
      } else {
        [userId] = await db('users').insert({
          username,
          role: 'parent',
          password: passwordHash,
          email_encrypted: encryptText(guardian.email || `${username}@smtthane.edu`),
        });
      }

      await db('guardians').where({ id: guardian.id }).update({ user_id: userId, updated_at: new Date().toISOString() });

      results.push({
        division,
        student: `${student.first_name} ${student.last_name}`,
        studentCode: student.student_code,
        rollNo: student.roll_no,
        username,
        password,
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error('[seedGrade3ParentLogins] failed:', err);
  process.exit(1);
});
