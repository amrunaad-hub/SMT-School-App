// Audit trail: who logged in/out when and from what IP, plus a brief record
// of every write (POST/PUT/DELETE) made anywhere in the app. Powers the
// superuser-only Server Logs page.
exports.up = async function (knex) {
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id');
    t.string('event_type').notNullable(); // 'login' | 'logout' | 'request'
    t.integer('user_id');
    t.string('username');
    t.string('role');
    t.string('ip_address');
    t.string('method');
    t.string('path');
    t.text('summary');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('audit_logs', (t) => {
    t.index(['created_at']);
    t.index(['event_type']);
    t.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('audit_logs');
};
