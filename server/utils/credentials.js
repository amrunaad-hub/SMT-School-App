const crypto = require('crypto');

// Readable-ish, collision-checked login for a newly onboarded parent, seeded
// from their mobile number so it's memorable. `executor` must be the active
// knex transaction handle when called from inside one — SQLite's pool here is a
// single connection, so querying the module-level `db` from within an open
// transaction deadlocks waiting for a connection the transaction already holds.
async function generateUsername(executor, seed) {
  const digits = String(seed || '').replace(/\D/g, '').slice(-10);
  const base = digits ? `p${digits}` : `parent${crypto.randomInt(100000, 999999)}`;
  let username = base;
  let attempt = 0;
  while (await executor('users').where({ username }).first()) {
    attempt += 1;
    username = `${base}${attempt}`;
  }
  return username;
}

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url'); // ~8 chars, no ambiguous padding
}

module.exports = { generateUsername, generateTempPassword };
