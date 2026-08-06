// forms.target_parents/target_teachers are redundant now that Forms adopted
// Notices' actual audience model (server/utils/noticeAudience.js): grade/
// division selection always reaches parents directly, and Teachers is its
// own independent facet (allTeachers/teacherIds) inside target_audience —
// same shape, not a separate pair of role flags. Plain boolean columns with
// no CHECK constraint, so (unlike the enum-widening migrations elsewhere in
// this directory) a direct DROP COLUMN is safe — SQLite has supported it
// natively since 3.35.0, well below this project's version.
exports.up = async function (knex) {
  await knex.schema.alterTable('forms', (t) => {
    t.dropColumn('target_parents');
    t.dropColumn('target_teachers');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('forms', (t) => {
    t.boolean('target_parents').defaultTo(false);
    t.boolean('target_teachers').defaultTo(false);
  });
};
