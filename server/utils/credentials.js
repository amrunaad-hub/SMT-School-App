const crypto = require('crypto');

// Readable, collision-checked login seeded from the person's name (e.g.
// "Renu Sagare" -> "renu.sagare") so it's easy to tell people their own
// username over the phone. `executor` must be the active knex transaction
// handle when called from inside one — SQLite's pool here is a single
// connection, so querying the module-level `db` from within an open
// transaction deadlocks waiting for a connection the transaction already holds.
function slugifyName(fullName) {
  const parts = String(fullName || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].replace(/[^a-z]/g, '');
  return `${parts[0]}.${parts[parts.length - 1]}`.replace(/[^a-z.]/g, '');
}

async function generateUsername(executor, fullName) {
  const base = slugifyName(fullName) || `user${crypto.randomInt(1000, 9999)}`;
  let username = base;
  let attempt = 1;
  while (await executor('users').where({ username }).first()) {
    attempt += 1;
    username = `${base}${attempt}`;
  }
  return username;
}

// Intuitive-but-temporary: Capitalized first name + "@" + 4 random digits
// (e.g. "Renu@7392"). Meant to be relayed once and changed on first login —
// this app has no forced-change-on-first-login flow yet, so anyone left on
// their temp password long-term is only as safe as a 4-digit suffix.
function generateTempPassword(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || 'User';
  const capitalized = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  const digits = crypto.randomInt(1000, 9999);
  return `${capitalized}@${digits}`;
}

module.exports = { generateUsername, generateTempPassword };
