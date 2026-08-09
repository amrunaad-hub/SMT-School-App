// Same lock pattern already used for attendance (is_locked/locked_at/locked_by)
// — once a teacher submits a period's classwork/homework/instructions, it's
// locked from further edits for that grade+division+date+period, same as
// attendance records lock once submitted for the day.
exports.up = async function (knex) {
  await knex.schema.alterTable('timetable_period_notes', (t) => {
    t.boolean('is_locked').defaultTo(false);
    t.timestamp('locked_at');
    t.integer('locked_by').unsigned().references('id').inTable('users');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('timetable_period_notes', (t) => {
    t.dropColumn('is_locked');
    t.dropColumn('locked_at');
    t.dropColumn('locked_by');
  });
};
