// users.role is a SQLite CHECK-constraint enum (['admin', 'parent',
// 'teacher', 'principal'] from 001_users.js) — widening it needs the
// rebuild-and-swap technique already used in 007/015 for the same kind of
// constraint on other tables (SQLite can't ALTER a CHECK constraint in
// place). Adds 'superuser', an unfettered-access role (see
// middleware/authorize.js) with its own Server Logs / audit-trail page.
//
// Unlike 007/015, this one needs `transaction: false` below: SQLite is a
// documented no-op for `PRAGMA foreign_keys` while a transaction is open,
// and knex wraps every migration in one by default — so the PRAGMA below
// silently didn't take effect and DROP TABLE users correctly failed with a
// FK violation (many tables reference users.id: guardians, staff, notices,
// leave_requests, documents.uploaded_by, and more). Rolled back cleanly
// with no data loss since it was still inside that transaction; this
// rerun runs untransacted so the PRAGMA actually applies.
exports.config = { transaction: false };

exports.up = async function (knex) {
  if (knex.client.config.client === 'pg') {
    // Postgres allows DDL in a transaction and can ALTER a CHECK constraint
    // directly — none of the SQLite PRAGMA/rebuild-and-swap concerns below
    // apply. Also no incoming-FK complication: Postgres FKs don't need to be
    // disabled to modify a table's own constraint, only to drop/recreate it.
    await knex.raw('ALTER TABLE users DROP CONSTRAINT users_role_check');
    await knex.raw(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'parent', 'teacher', 'principal', 'superuser'))
    `);
  } else {
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
  }
};

exports.down = async function (knex) {
  if (knex.client.config.client === 'pg') {
    await knex('users').where({ role: 'superuser' }).del();
    await knex.raw('ALTER TABLE users DROP CONSTRAINT users_role_check');
    await knex.raw(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'parent', 'teacher', 'principal'))
    `);
  } else {
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
  }
};
