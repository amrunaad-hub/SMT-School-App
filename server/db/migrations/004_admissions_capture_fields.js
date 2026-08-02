// The public admission form (Module 1) captures a few enquiry-stage fields that
// don't yet exist on `admissions` — richer medical/address detail lives on the
// `students` row post-approval (see 003_module1_admissions_students.js), but the
// enquiry itself needs somewhere to hold what the family submits.
exports.up = async function (knex) {
  await knex.schema.alterTable('admissions', (t) => {
    t.text('address');
    t.string('blood_group');
    t.text('medical_notes');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('admissions', (t) => {
    t.dropColumn('address');
    t.dropColumn('blood_group');
    t.dropColumn('medical_notes');
  });
};
