// Admin-built data-collection forms — title/description/typed fields, an
// audience (grade/division, same JSON shape as notices.target_audience —
// see server/utils/noticeAudience.js), and who it's for (parents/teachers).
// One row per parent/teacher response per form (form_submissions), edited
// in place by resubmitting rather than accumulating duplicates.
exports.up = async function (knex) {
  await knex.schema.createTable('forms', (t) => {
    t.increments('id');
    t.string('title').notNullable();
    t.text('description');
    t.text('fields').notNullable(); // JSON: [{ id, type, label, required, options }]
    t.text('target_audience').notNullable(); // JSON: { allGrades, gradeSelections: [{grade, allDivisions, divisions}] }
    t.boolean('target_parents').defaultTo(false);
    t.boolean('target_teachers').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.integer('created_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('form_submissions', (t) => {
    t.increments('id');
    t.integer('form_id').notNullable().references('id').inTable('forms').onDelete('CASCADE');
    t.integer('submitted_by').notNullable().references('id').inTable('users');
    t.text('answers').notNullable(); // JSON: { [fieldId]: value } — file fields store a documents.id
    t.timestamp('submitted_at').defaultTo(knex.fn.now());
    t.unique(['form_id', 'submitted_by']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('form_submissions');
  await knex.schema.dropTableIfExists('forms');
};
