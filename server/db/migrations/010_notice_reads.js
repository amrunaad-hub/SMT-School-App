// Per-recipient "opened this notice" tracking, so admins can see reach vs
// actual open rate for a circular (previously invisible).
exports.up = async function (knex) {
  await knex.schema.createTable('notice_reads', (t) => {
    t.increments('id');
    t.integer('notice_id').notNullable().references('id').inTable('notices').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('opened_at').defaultTo(knex.fn.now());
    t.unique(['notice_id', 'user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notice_reads');
};
