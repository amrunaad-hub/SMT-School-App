// Teacher timetable navigation + per-date period notes + attendance overhaul.
// See C:\Users\aplus\.claude\plans\shimmying-beaming-swan.md for full rationale.
exports.up = async function (knex) {
  // Replaces the in-memory `leaveStore` in server/routes/attendance.js, which
  // reset on every restart and had no ownership check.
  await knex.schema.createTable('leave_requests', (t) => {
    t.increments('id');
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.enu('type', ['advance', 'regularization']).defaultTo('advance');
    t.date('from_date').notNullable();
    t.date('to_date').notNullable();
    t.string('reason');
    t.enu('status', ['Pending', 'Approved', 'Rejected']).defaultTo('Pending');
    t.integer('requested_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('leave_requests', (t) => {
    t.index(['student_id', 'from_date', 'to_date']);
  });

  // Sparse per-date overlay on top of the weekly `timetables` template — that
  // table still answers "what subject is period N on Tuesdays"; this answers
  // "what did the teacher assign for period N on 12 Aug 2026."
  await knex.schema.createTable('timetable_period_notes', (t) => {
    t.increments('id');
    t.integer('grade').notNullable();
    t.string('division').notNullable();
    t.date('date').notNullable();
    t.integer('period_index').notNullable();
    t.text('classwork');
    t.text('homework');
    t.text('special_instructions');
    t.integer('created_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['grade', 'division', 'date', 'period_index']);
  });

  // Per-recipient in-app notification — distinct from the existing `notices`
  // table, which only supports broadcast to 5 coarse audience tags.
  await knex.schema.createTable('notifications', (t) => {
    t.increments('id');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('body');
    t.string('related_type');
    t.integer('related_id');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('notifications', (t) => {
    t.index(['user_id', 'is_read']);
  });

  await knex.schema.alterTable('attendance', (t) => {
    t.boolean('is_locked').defaultTo(false);
    t.timestamp('locked_at');
    t.integer('locked_by').references('id').inTable('users');
  });

  // documents.owner_type is a SQLite CHECK-constraint enum — widening it needs
  // the rebuild-and-swap technique already used in 004_admissions_capture_fields.js.
  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('documents_new', (t) => {
    t.increments('id');
    t.enu('owner_type', ['student', 'admission', 'period_note', 'leave_request']).notNullable();
    t.integer('owner_id').notNullable();
    t.enu('doc_type', ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other']).defaultTo('Other');
    t.string('file_url').notNullable();
    t.string('original_filename');
    t.integer('uploaded_by').references('id').inTable('users');
    t.timestamp('uploaded_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    INSERT INTO documents_new (id, owner_type, owner_id, doc_type, file_url, original_filename, uploaded_by, uploaded_at)
    SELECT id, owner_type, owner_id, doc_type, file_url, original_filename, uploaded_by, uploaded_at FROM documents
  `);

  await knex.schema.dropTable('documents');
  await knex.schema.renameTable('documents_new', 'documents');
  await knex.schema.alterTable('documents', (t) => {
    t.index(['owner_type', 'owner_id']);
  });

  await knex.raw('PRAGMA foreign_keys = ON');
};

exports.down = async function (knex) {
  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('documents_old', (t) => {
    t.increments('id');
    t.enu('owner_type', ['student', 'admission']).notNullable();
    t.integer('owner_id').notNullable();
    t.enu('doc_type', ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other']).defaultTo('Other');
    t.string('file_url').notNullable();
    t.string('original_filename');
    t.integer('uploaded_by').references('id').inTable('users');
    t.timestamp('uploaded_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    INSERT INTO documents_old (id, owner_type, owner_id, doc_type, file_url, original_filename, uploaded_by, uploaded_at)
    SELECT id, owner_type, owner_id, doc_type, file_url, original_filename, uploaded_by, uploaded_at FROM documents
    WHERE owner_type IN ('student', 'admission')
  `);

  await knex.schema.dropTable('documents');
  await knex.schema.renameTable('documents_old', 'documents');
  await knex.schema.alterTable('documents', (t) => {
    t.index(['owner_type', 'owner_id']);
  });

  await knex.raw('PRAGMA foreign_keys = ON');

  await knex.schema.alterTable('attendance', (t) => {
    t.dropColumn('is_locked');
    t.dropColumn('locked_at');
    t.dropColumn('locked_by');
  });

  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('timetable_period_notes');
  await knex.schema.dropTableIfExists('leave_requests');
};
