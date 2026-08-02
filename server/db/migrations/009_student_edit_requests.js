// Parent self-service on the Student Profile: most fields are directly
// editable, but identity/KYC fields (name, DOB, Aadhar, Apaar ID, GR/PEN/SARAL
// numbers) and document uploads instead land here for admin approval, rather
// than writing straight to `students`/`documents`.
exports.up = async function (knex) {
  await knex.schema.createTable('student_edit_requests', (t) => {
    t.increments('id');
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.integer('requested_by').notNullable().references('id').inTable('users');
    t.enu('kind', ['fields', 'document']).notNullable();
    t.text('changes').notNullable();
    t.enu('status', ['Pending', 'Approved', 'Rejected']).defaultTo('Pending');
    t.text('admin_note');
    t.integer('reviewed_by').references('id').inTable('users');
    t.timestamp('reviewed_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('student_edit_requests', (t) => {
    t.index(['student_id', 'status']);
    t.index(['status']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_edit_requests');
};
