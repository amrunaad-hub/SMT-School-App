// PTA (grade-wide) and Class Representative (division-wide) are add-on
// designations on an existing guardian/parent account — the account keeps
// role='parent' (still logs in and sees their own child normally), these
// tables just record who additionally holds the title. A PTA rep for a
// grade automatically becomes the default class_representatives entry for
// their own ward's division (is_pta_default=true, synced in
// server/utils/representatives.js whenever the PTA assignment changes);
// admin explicitly assigns the other two divisions' reps (is_pta_default=false).
exports.up = async function (knex) {
  await knex.schema.createTable('pta_representatives', (t) => {
    t.increments('id');
    t.integer('grade').notNullable().unique();
    t.integer('guardian_id').notNullable().references('id').inTable('guardians').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('class_representatives', (t) => {
    t.increments('id');
    t.integer('grade').notNullable();
    t.enu('division', ['alpha', 'beta', 'gamma']).notNullable();
    t.integer('guardian_id').notNullable().references('id').inTable('guardians').onDelete('CASCADE');
    t.boolean('is_pta_default').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['grade', 'division']);
  });

  // Badges a notice as authored by a PTA/class rep rather than the school
  // itself, so the parent-facing Communication feed can style/label it
  // differently. Existing rows default to 'school'.
  await knex.schema.alterTable('notices', (t) => {
    t.enu('source', ['school', 'pta', 'class_rep']).defaultTo('school');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('notices', (t) => {
    t.dropColumn('source');
  });
  await knex.schema.dropTableIfExists('class_representatives');
  await knex.schema.dropTableIfExists('pta_representatives');
};
