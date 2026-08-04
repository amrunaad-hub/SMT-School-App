// One-off maintenance script: resets every real teacher login's password to
// their staff code (already a stable, visible identifier throughout the
// app) so credentials are known/documentable — mirrors the predictable
// g3<division><rollno> pattern used for Grade 3 parent logins. Idempotent —
// safe to re-run. Does not touch the generic teacher/teacher demo account.
const bcrypt = require('bcryptjs');
const db = require('../db/database');

async function run() {
  const staffRows = await db('staff').whereNotNull('user_id').orderBy('staff_code', 'asc');
  const results = [];

  for (const staff of staffRows) {
    const user = await db('users').where({ id: staff.user_id }).first();
    if (!user) continue;

    const password = staff.staff_code;
    const passwordHash = await bcrypt.hash(password, 12);
    await db('users').where({ id: user.id }).update({ password: passwordHash });

    results.push({
      staffCode: staff.staff_code,
      displayName: staff.display_name,
      username: user.username,
      password,
    });
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error('[seedTeacherLoginPasswords] failed:', err);
  process.exit(1);
});
