// documents.owner_type is a SQLite CHECK-constraint enum, currently
// ['student', 'admission', 'period_note', 'leave_request'] (widened by
// 007_timetable_attendance_upgrade.js). 'notice' was added to
// server/routes/uploads.js's OWNER_TYPES app-level whitelist for notice
// attachments, but the DB constraint was never widened to match — every
// notice attachment upload has been failing with SQLITE_CONSTRAINT since,
// silently swallowed as a generic 500 by the client. Same rebuild-and-swap
// technique as 007 (SQLite can't ALTER a CHECK constraint in place).
exports.up = async function (knex) {
  await knex.raw('PRAGMA foreign_keys = OFF');

  await knex.schema.createTable('documents_new', (t) => {
    t.increments('id');
    t.enu('owner_type', ['student', 'admission', 'period_note', 'leave_request', 'notice']).notNullable();
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
    t.enu('owner_type', ['student', 'admission', 'period_note', 'leave_request']).notNullable();
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
    WHERE owner_type IN ('student', 'admission', 'period_note', 'leave_request')
  `);

  await knex.schema.dropTable('documents');
  await knex.schema.renameTable('documents_old', 'documents');
  await knex.schema.alterTable('documents', (t) => {
    t.index(['owner_type', 'owner_id']);
  });

  await knex.raw('PRAGMA foreign_keys = ON');
};
