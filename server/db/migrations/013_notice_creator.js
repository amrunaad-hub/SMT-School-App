// Tracks which user actually created a notice, so teachers (who can now also
// send notices, not just admin/principal) can only edit/deactivate/delete
// their own — existing `issued_by` is just a free-text display name, not
// suitable for an ownership check.
exports.up = async function (knex) {
  await knex.schema.alterTable('notices', (t) => {
    t.integer('created_by_user_id').references('id').inTable('users');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('notices', (t) => {
    t.dropColumn('created_by_user_id');
  });
};
