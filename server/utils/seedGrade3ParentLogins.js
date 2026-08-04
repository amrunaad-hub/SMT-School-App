// One-off maintenance script: creates parent-role login accounts linked to
// every real Grade 3 student across all divisions (alpha/beta/gamma), for
// manual QA of the parent dashboard against actual student data instead of
// the generic parent/parent demo account. Idempotent — safe to re-run.
//
// Creates up to two logins per student: a primary login (the is_primary
// guardian) and, if a second guardian is linked to the student, an
// additional login (username suffixed with `b`) — so either parent can log
// in independently, matching how most students have two linked guardians
// (father + mother).
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { encryptText } = require('./crypto');

const DIVISIONS = ['alpha', 'beta', 'gamma'];

async function ensureLogin(username, guardian) {
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
  return password;
}

async function run() {
  const results = [];

  for (const division of DIVISIONS) {
    const students = await db('students')
      .where({ grade: 3, division, status: 'Active' })
      .orderBy('roll_no', 'asc');

    for (const student of students) {
      const links = await db('student_guardians').where({ student_id: student.id }).orderBy('id', 'asc');
      if (!links.length) {
        console.log(`[seedGrade3ParentLogins] No guardian found for ${student.student_code}, skipping`);
        continue;
      }
      const primaryLink = links.find((l) => l.is_primary) || links[0];
      const additionalLink = links.find((l) => l.id !== primaryLink.id) || null;

      const primaryGuardian = await db('guardians').where({ id: primaryLink.guardian_id }).first();
      const primaryUsername = `g3${division}${student.roll_no}`;
      const primaryPassword = await ensureLogin(primaryUsername, primaryGuardian);

      let additional = null;
      if (additionalLink) {
        const additionalGuardian = await db('guardians').where({ id: additionalLink.guardian_id }).first();
        const additionalUsername = `${primaryUsername}b`;
        const additionalPassword = await ensureLogin(additionalUsername, additionalGuardian);
        additional = {
          guardianName: additionalGuardian.full_name,
          relation: additionalLink.relation,
          username: additionalUsername,
          password: additionalPassword,
        };
      }

      results.push({
        division,
        student: `${student.first_name} ${student.last_name}`,
        studentCode: student.student_code,
        rollNo: student.roll_no,
        primary: {
          guardianName: primaryGuardian.full_name,
          relation: primaryLink.relation,
          username: primaryUsername,
          password: primaryPassword,
        },
        additional,
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
