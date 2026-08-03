// Per-recipient "opened this teaching update" tracking, mirroring
// notice_reads — lets a teacher see how many parents actually opened a
// classwork/homework note, not just that it exists.
exports.up = async function (knex) {
  await knex.schema.createTable('period_note_reads', (t) => {
    t.increments('id');
    t.integer('period_note_id').notNullable().references('id').inTable('timetable_period_notes').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('opened_at').defaultTo(knex.fn.now());
    t.unique(['period_note_id', 'user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('period_note_reads');
};
