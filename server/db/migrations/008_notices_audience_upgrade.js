// Adds a pure-display event date (separate from the "show until" expiry,
// which now only governs Active/Archived bucketing, never hides the row) and
// widens target_audience from a flat role-tag array into a structured funnel
// object. See C:\Users\aplus\.claude\plans\shimmying-beaming-swan.md.
exports.up = async function (knex) {
  await knex.schema.alterTable('notices', (t) => {
    t.date('event_date');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('notices', (t) => {
    t.dropColumn('event_date');
  });
};
