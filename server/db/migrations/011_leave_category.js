// Medical vs Casual, independent of the advance/regularization type (which is
// derived from dates, not chosen by the parent).
exports.up = async function (knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.enu('category', ['Medical', 'Casual']).defaultTo('Casual');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropColumn('category');
  });
};
