// users.role is a SQLite CHECK-constraint enum (['admin', 'parent',
// 'teacher', 'principal'] from 001_users.js) — widening it needs the
// rebuild-and-swap technique already used in 007/015 for the same kind of
// constraint on other tables (SQLite can't ALTER a CHECK constraint in
// place). Adds 'superuser', an unfettered-access role (see
// middleware/authorize.js) with its own Server Logs / audit-trail page.
exports.up = async function (knex) {
  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('users_new', (t) => {
    t.increments('id');
    t.string('username').notNullable().unique();
    t.string('email_encrypted').defaultTo('');
    t.string('password').notNullable();
    t.enu('role', ['admin', 'parent', 'teacher', 'principal', 'superuser']).defaultTo('parent');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    INSERT INTO users_new (id, username, email_encrypted, password, role, created_at)
    SELECT id, username, email_encrypted, password, role, created_at FROM users
  `);

  await knex.schema.dropTable('users');
  await knex.schema.renameTable('users_new', 'users');

  await knex.raw('PRAGMA foreign_keys = ON');
};

exports.down = async function (knex) {
  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('users_old', (t) => {
    t.increments('id');
    t.string('username').notNullable().unique();
    t.string('email_encrypted').defaultTo('');
    t.string('password').notNullable();
    t.enu('role', ['admin', 'parent', 'teacher', 'principal']).defaultTo('parent');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    INSERT INTO users_old (id, username, email_encrypted, password, role, created_at)
    SELECT id, username, email_encrypted, password, role, created_at FROM users
    WHERE role IN ('admin', 'parent', 'teacher', 'principal')
  `);

  await knex.schema.dropTable('users');
  await knex.schema.renameTable('users_old', 'users');

  await knex.raw('PRAGMA foreign_keys = ON');
};
