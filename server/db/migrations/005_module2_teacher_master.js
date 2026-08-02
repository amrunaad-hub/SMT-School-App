// Module 2 (Teacher Master). Adds staff<->users login linkage (mirrors
// guardians.user_id from Module 1), which classes/grades a teacher is assigned
// to, and an audited class-teacher-of-record designation per grade+division. See
// C:\Users\aplus\.claude\plans\wiggly-baking-corbato.md ("Module 2") for the
// full architecture rationale.
exports.up = async function (knex) {
  await knex.schema.alterTable('staff', (t) => {
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.text('roles'); // JSON array of free-form tags, e.g. ["Teacher","Class Teacher"]
    t.integer('house_id').references('id').inTable('houses');
    t.string('emergency_contact_name');
    t.string('emergency_contact_phone');
    t.string('emergency_contact_relation');
  });

  // Which grade+division(s) a teacher actually teaches. Simple fact, no history —
  // unlike class-teacher-of below, nothing about a teaching assignment changing
  // needs an audit trail.
  await knex.schema.createTable('staff_class_assignments', (t) => {
    t.increments('id');
    t.integer('staff_id').notNullable().references('id').inTable('staff').onDelete('CASCADE');
    t.integer('grade').notNullable();
    t.string('division').notNullable();
    t.string('academic_year').notNullable().defaultTo('2025-26');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['staff_id', 'grade', 'division', 'academic_year']);
  });
  await knex.schema.alterTable('staff_class_assignments', (t) => {
    t.index(['grade', 'division', 'academic_year']);
  });

  // The official "class teacher of Grade X Division Y" designation. Append-only:
  // reassigning sets `unassigned_at` on the current holder's row and inserts a new
  // one, so `WHERE unassigned_at IS NULL` gives the current holder while every
  // past assignment stays queryable as history.
  await knex.schema.createTable('class_teacher_history', (t) => {
    t.increments('id');
    t.integer('grade').notNullable();
    t.string('division').notNullable();
    t.string('academic_year').notNullable().defaultTo('2025-26');
    t.integer('staff_id').notNullable().references('id').inTable('staff').onDelete('CASCADE');
    t.integer('assigned_by').references('id').inTable('users');
    t.timestamp('assigned_at').defaultTo(knex.fn.now());
    t.timestamp('unassigned_at');
  });
  await knex.schema.alterTable('class_teacher_history', (t) => {
    t.index(['grade', 'division', 'academic_year', 'unassigned_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('class_teacher_history');
  await knex.schema.dropTableIfExists('staff_class_assignments');
  await knex.schema.alterTable('staff', (t) => {
    t.dropColumn('user_id');
    t.dropColumn('roles');
    t.dropColumn('house_id');
    t.dropColumn('emergency_contact_name');
    t.dropColumn('emergency_contact_phone');
    t.dropColumn('emergency_contact_relation');
  });
};
