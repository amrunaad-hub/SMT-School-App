// Module 1 (Admission & Student Master) extension. Adds guardians as first-class,
// normalized data (source of truth for parent/guardian contact + parent-login
// linkage), houses, documents, and an admission approval audit trail. See
// C:\Users\aplus\.claude\plans\wiggly-baking-corbato.md ("Module 1") for the
// full architecture rationale.
exports.up = async function (knex) {
  await knex.schema.createTable('houses', (t) => {
    t.increments('id');
    t.string('name').notNullable().unique();
    t.string('color_hex').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex('houses').insert([
    { name: 'Ganga', color_hex: '#2563eb' },
    { name: 'Yamuna', color_hex: '#16a34a' },
    { name: 'Godavari', color_hex: '#d97706' },
    { name: 'Krishna', color_hex: '#dc2626' },
  ]);

  // Source of truth for parent/guardian contact info and parent-login linkage.
  // `students.parent_name/parent_mobile/parent_email` stay in place as a synced
  // denormalized snapshot of the primary guardian, so existing reads (StudentProfile,
  // SIS search) keep working unchanged.
  await knex.schema.createTable('guardians', (t) => {
    t.increments('id');
    t.string('full_name').notNullable();
    t.string('mobile').notNullable();
    t.string('email');
    t.string('occupation');
    t.text('address');
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('guardians', (t) => {
    t.index(['mobile']);
  });

  // Many-to-many: siblings share a guardian row, a student can have multiple guardians.
  await knex.schema.createTable('student_guardians', (t) => {
    t.increments('id');
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.integer('guardian_id').notNullable().references('id').inTable('guardians').onDelete('CASCADE');
    t.enu('relation', ['Father', 'Mother', 'Guardian', 'Other']).notNullable().defaultTo('Guardian');
    t.boolean('is_primary').defaultTo(false);
    t.boolean('is_emergency_contact').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['student_id', 'guardian_id']);
  });

  await knex.schema.createTable('documents', (t) => {
    t.increments('id');
    t.enu('owner_type', ['student', 'admission']).notNullable();
    t.integer('owner_id').notNullable();
    t.enu('doc_type', ['Birth Certificate', 'Aadhar', 'Transfer Certificate', 'Photo', 'Medical Certificate', 'Other']).defaultTo('Other');
    t.string('file_url').notNullable();
    t.string('original_filename');
    t.integer('uploaded_by').references('id').inTable('users');
    t.timestamp('uploaded_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('documents', (t) => {
    t.index(['owner_type', 'owner_id']);
  });

  await knex.schema.createTable('admission_status_log', (t) => {
    t.increments('id');
    t.integer('admission_id').notNullable().references('id').inTable('admissions').onDelete('CASCADE');
    t.string('from_status');
    t.string('to_status').notNullable();
    t.integer('changed_by').references('id').inTable('users');
    t.string('note');
    t.timestamp('changed_at').defaultTo(knex.fn.now());
  });

  // Plain ADD COLUMN — safe in SQLite, no existing constraints touched.
  await knex.schema.alterTable('students', (t) => {
    t.integer('house_id').references('id').inTable('houses');
    t.string('blood_group');
    t.text('medical_conditions');
    t.text('medical_notes');
    t.integer('transport_route_id').references('id').inTable('transport_routes');
    t.string('previous_school_name');
    t.string('previous_school_board');
    t.string('previous_grade_completed');
    t.integer('admission_id').references('id').inTable('admissions');
    t.integer('is_twin_of').references('id').inTable('students');
  });

  // admissions.status is an enum (CHECK constraint). Widening it to add
  // 'Clarification Requested' needs different techniques per engine:
  // Postgres can ALTER a CHECK constraint directly (DROP + ADD), but SQLite
  // has no ALTER COLUMN/CONSTRAINT at all, so it needs the rebuild-and-swap
  // technique SQLite's own docs recommend: create a new table with the
  // desired schema, copy rows across, drop the old one, rename in.
  if (knex.client.config.client === 'pg') {
    // The SQLite rebuild below does two things at once: widens the status
    // enum AND adds three columns (is_draft/draft_token/student_id) that
    // don't exist on the table migration 002 originally created. On
    // Postgres both are handled directly, without any rebuild.
    //
    // knex's default (non-native) `.enu()` constraint name on Postgres is
    // always `<table>_<column>_check` — verified directly against a real
    // Postgres instance before writing this.
    await knex.raw('ALTER TABLE admissions DROP CONSTRAINT admissions_status_check');
    await knex.raw(`
      ALTER TABLE admissions ADD CONSTRAINT admissions_status_check
      CHECK (status IN ('Enquiry', 'In Process', 'Document Verification', 'Clarification Requested', 'Confirmed', 'Rejected'))
    `);
    await knex.schema.alterTable('admissions', (t) => {
      t.boolean('is_draft').defaultTo(false);
      t.string('draft_token').unique();
      t.integer('student_id').references('id').inTable('students');
    });
    // No index re-creation needed here (unlike the SQLite branch below) — the
    // table itself is never dropped on this path, so the index migration 002
    // already created on ['status', 'applying_for_grade'] is untouched.
  } else {
    await knex.raw('PRAGMA foreign_keys = OFF');

    await knex.schema.createTable('admissions_new', (t) => {
      t.increments('id');
      t.string('enquiry_code').unique();
      t.string('child_name').notNullable();
      t.date('dob');
      t.string('current_school');
      t.integer('applying_for_grade');
      t.enu('enquiry_type', ['New Admission', 'Transfer', 'Re-Admission']).defaultTo('New Admission');
      t.string('area');
      t.string('parent_name');
      t.string('parent_mobile');
      t.string('parent_email');
      t.enu('source', ['Website', 'Phone', 'Walk-in', 'Referral', 'Social Media']).defaultTo('Phone');
      t.enu('status', ['Enquiry', 'In Process', 'Document Verification', 'Clarification Requested', 'Confirmed', 'Rejected']).defaultTo('Enquiry');
      t.string('follow_up_note');
      t.string('rejection_reason');
      t.string('assigned_to');
      t.string('academic_year').defaultTo('2025-26');
      t.boolean('is_draft').defaultTo(false);
      t.string('draft_token').unique();
      t.integer('student_id').references('id').inTable('students');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await knex.raw(`
      INSERT INTO admissions_new (
        id, enquiry_code, child_name, dob, current_school, applying_for_grade,
        enquiry_type, area, parent_name, parent_mobile, parent_email, source,
        status, follow_up_note, rejection_reason, assigned_to, academic_year,
        created_at, updated_at
      )
      SELECT
        id, enquiry_code, child_name, dob, current_school, applying_for_grade,
        enquiry_type, area, parent_name, parent_mobile, parent_email, source,
        status, follow_up_note, rejection_reason, assigned_to, academic_year,
        created_at, updated_at
      FROM admissions
    `);

    await knex.schema.dropTable('admissions');
    await knex.schema.renameTable('admissions_new', 'admissions');
    await knex.schema.alterTable('admissions', (t) => {
      t.index(['status', 'applying_for_grade']);
    });

    await knex.raw('PRAGMA foreign_keys = ON');
  }
};

exports.down = async function (knex) {
  if (knex.client.config.client === 'pg') {
    // Existing rows carrying the value being dropped from the constraint
    // must be remapped BEFORE the narrower CHECK is re-added, or the ADD
    // CONSTRAINT itself fails against those rows.
    await knex('admissions').where({ status: 'Clarification Requested' }).update({ status: 'In Process' });
    await knex.raw('ALTER TABLE admissions DROP CONSTRAINT admissions_status_check');
    await knex.raw(`
      ALTER TABLE admissions ADD CONSTRAINT admissions_status_check
      CHECK (status IN ('Enquiry', 'In Process', 'Document Verification', 'Confirmed', 'Rejected'))
    `);
    await knex.schema.alterTable('admissions', (t) => {
      t.dropColumn('is_draft');
      t.dropColumn('draft_token');
      t.dropColumn('student_id');
    });
  } else {
    await knex.raw('PRAGMA foreign_keys = OFF');

    await knex.schema.createTable('admissions_old', (t) => {
      t.increments('id');
      t.string('enquiry_code').unique();
      t.string('child_name').notNullable();
      t.date('dob');
      t.string('current_school');
      t.integer('applying_for_grade');
      t.enu('enquiry_type', ['New Admission', 'Transfer', 'Re-Admission']).defaultTo('New Admission');
      t.string('area');
      t.string('parent_name');
      t.string('parent_mobile');
      t.string('parent_email');
      t.enu('source', ['Website', 'Phone', 'Walk-in', 'Referral', 'Social Media']).defaultTo('Phone');
      t.enu('status', ['Enquiry', 'In Process', 'Document Verification', 'Confirmed', 'Rejected']).defaultTo('Enquiry');
      t.string('follow_up_note');
      t.string('rejection_reason');
      t.string('assigned_to');
      t.string('academic_year').defaultTo('2025-26');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await knex.raw(`
      INSERT INTO admissions_old (
        id, enquiry_code, child_name, dob, current_school, applying_for_grade,
        enquiry_type, area, parent_name, parent_mobile, parent_email, source,
        status, follow_up_note, rejection_reason, assigned_to, academic_year,
        created_at, updated_at
      )
      SELECT
        id, enquiry_code, child_name, dob, current_school, applying_for_grade,
        enquiry_type, area, parent_name, parent_mobile, parent_email, source,
        CASE WHEN status = 'Clarification Requested' THEN 'In Process' ELSE status END,
        follow_up_note, rejection_reason, assigned_to, academic_year,
        created_at, updated_at
      FROM admissions
    `);

    await knex.schema.dropTable('admissions');
    await knex.schema.renameTable('admissions_old', 'admissions');
    await knex.schema.alterTable('admissions', (t) => {
      t.index(['status', 'applying_for_grade']);
    });

    await knex.raw('PRAGMA foreign_keys = ON');
  }

  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('house_id');
    t.dropColumn('blood_group');
    t.dropColumn('medical_conditions');
    t.dropColumn('medical_notes');
    t.dropColumn('transport_route_id');
    t.dropColumn('previous_school_name');
    t.dropColumn('previous_school_board');
    t.dropColumn('previous_grade_completed');
    t.dropColumn('admission_id');
    t.dropColumn('is_twin_of');
  });

  await knex.schema.dropTableIfExists('admission_status_log');
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('student_guardians');
  await knex.schema.dropTableIfExists('guardians');
  await knex.schema.dropTableIfExists('houses');
};
