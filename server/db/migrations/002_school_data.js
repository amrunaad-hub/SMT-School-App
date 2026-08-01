// Converts the 12 remaining Mongoose models to SQLite tables. Mongoose sub-document
// arrays/objects (periods, installments, stops, compensation, checklist, etc.) become
// JSON text columns, parsed/stringified in the route layer the same way tooth_records
// arrays are handled in the dental-clinic-app (see parseArr()-style helpers).
exports.up = async function (knex) {
  await knex.schema.createTable('students', (t) => {
    t.increments('id');
    t.string('student_code').notNullable().unique();
    t.string('first_name').notNullable();
    t.string('last_name').defaultTo('');
    t.integer('grade').notNullable();
    t.enu('division', ['alpha', 'beta', 'gamma']).notNullable();
    t.integer('roll_no').notNullable();
    t.enu('gender', ['Male', 'Female']).defaultTo('Male');
    t.date('dob');
    t.string('parent_name');
    t.string('parent_mobile');
    t.string('parent_email');
    t.text('address');
    t.string('photo_url');
    t.boolean('is_rte').defaultTo(false);
    t.boolean('is_maharashtrian').defaultTo(false);
    t.integer('admission_year');
    t.enu('status', ['Active', 'TC', 'Detained']).defaultTo('Active');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['grade', 'division', 'roll_no']);
  });

  await knex.schema.createTable('staff', (t) => {
    t.increments('id');
    t.string('staff_code').notNullable().unique();
    t.string('display_name').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.enu('gender', ['Male', 'Female']).notNullable();
    t.enu('category', ['Teaching', 'Non-Teaching']).notNullable();
    t.string('department');
    t.string('role');
    t.text('assigned_subjects'); // JSON array
    t.string('qualification');
    t.date('joining_date');
    t.string('phone');
    t.string('email');
    t.string('photo_url');
    t.boolean('is_maharashtrian').defaultTo(false);
    t.boolean('is_brahmin').defaultTo(false);
    t.text('compensation'); // JSON object: basePay, hra, academicAllowance, performanceBonus, monthlyGross, annualCtc
    t.integer('experience_years_prior').defaultTo(0);
    t.integer('experience_years_current_school').defaultTo(0);
    t.integer('classes_taken_total').defaultTo(0);
    t.integer('classes_taken_ytd').defaultTo(0);
    t.enu('status', ['Active', 'On Leave', 'Resigned']).defaultTo('Active');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('attendance', (t) => {
    t.increments('id');
    t.date('date').notNullable();
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.integer('grade').notNullable();
    t.string('division').notNullable();
    t.integer('roll_no').notNullable();
    t.enu('status', ['Present', 'Absent', 'Late', 'HalfDay']).defaultTo('Present');
    t.string('reason');
    t.enu('intimation', ['Advance leave', 'No prior intimation', '']).defaultTo('');
    t.string('follow_up');
    t.integer('marked_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['date', 'student_id']);
  });
  await knex.schema.alterTable('attendance', (t) => {
    t.index(['date', 'grade', 'division']);
  });

  await knex.schema.createTable('timetables', (t) => {
    t.increments('id');
    t.integer('grade').notNullable();
    t.string('division').notNullable();
    t.integer('day_of_week').notNullable();
    t.string('academic_year').defaultTo('2025-26');
    t.text('periods'); // JSON array of { periodIndex, time, type, subject, staffCode, teacherName, room }
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['grade', 'division', 'day_of_week', 'academic_year']);
  });

  await knex.schema.createTable('fees', (t) => {
    t.increments('id');
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.string('academic_year').notNullable().defaultTo('2025-26');
    t.boolean('is_rte').defaultTo(false);
    t.integer('annual_fee').defaultTo(90000);
    t.text('installments'); // JSON array of { installmentId, label, dueDate, amount, status, paymentDate, paymentMethod, transactionRef, note }
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['student_id', 'academic_year']);
  });

  await knex.schema.createTable('exams', (t) => {
    t.increments('id');
    t.string('exam_code').unique();
    t.string('title').notNullable();
    t.string('subject').notNullable();
    t.integer('grade').notNullable();
    t.string('division').defaultTo('all');
    t.enu('type', ['Unit Test', 'Mid-Term', 'Final', 'Oral', 'Practical']).notNullable();
    t.date('scheduled_date').notNullable();
    t.string('scheduled_time');
    t.integer('duration_minutes').defaultTo(60);
    t.integer('max_marks').defaultTo(100);
    t.integer('passing_marks').defaultTo(35);
    t.string('venue');
    t.string('invigilator');
    t.enu('status', ['Scheduled', 'Completed', 'Cancelled']).defaultTo('Scheduled');
    t.string('academic_year').defaultTo('2025-26');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('exams', (t) => {
    t.index(['grade', 'status']);
    t.index(['scheduled_date']);
  });

  await knex.schema.createTable('exam_results', (t) => {
    t.increments('id');
    t.integer('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
    t.integer('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.float('marks_obtained');
    t.enu('grade', ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']);
    t.string('remarks');
    t.boolean('is_absent').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['exam_id', 'student_id']);
  });

  await knex.schema.createTable('admissions', (t) => {
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
  await knex.schema.alterTable('admissions', (t) => {
    t.index(['status', 'applying_for_grade']);
  });

  await knex.schema.createTable('transport_routes', (t) => {
    t.increments('id');
    t.string('route_code').unique();
    t.string('route_name').notNullable();
    t.string('vehicle_number');
    t.string('driver_name');
    t.string('driver_phone');
    t.integer('capacity').defaultTo(40);
    t.integer('current_occupancy').defaultTo(0);
    t.string('morning_departure_time');
    t.string('evening_departure_time');
    t.text('stops'); // JSON array of { stopName, pickupTime, dropTime, sequence }
    t.enu('status', ['Active', 'Inactive']).defaultTo('Active');
    t.text('assigned_students'); // JSON array of student ids
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('inventory_items', (t) => {
    t.increments('id');
    t.string('item_code').unique();
    t.string('name').notNullable();
    t.enu('category', ['Stationery', 'Furniture', 'Electronics', 'Sports', 'Lab Equipment', 'Cleaning Supplies', 'Books', 'Other']).notNullable();
    t.string('unit').defaultTo('pcs');
    t.integer('quantity_in_stock').defaultTo(0);
    t.integer('reorder_level').defaultTo(10);
    t.float('unit_price');
    t.string('supplier');
    t.timestamp('last_restocked_at');
    t.string('location');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('inventory_items', (t) => {
    t.index(['category']);
  });

  await knex.schema.createTable('notices', (t) => {
    t.increments('id');
    t.string('notice_code').unique();
    t.string('title').notNullable();
    t.text('body').notNullable();
    t.enu('category', ['General', 'Academic', 'Fee', 'Event', 'Holiday', 'Exam', 'Urgent']).defaultTo('General');
    t.text('target_audience'); // JSON array of 'all'|'parents'|'teachers'|'students'|'staff'
    t.string('issued_by');
    t.timestamp('published_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at');
    t.string('attachment_url');
    t.enu('priority', ['Normal', 'High', 'Urgent']).defaultTo('Normal');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('notices', (t) => {
    t.index(['is_active', 'published_at']);
    t.index(['category']);
  });

  await knex.schema.createTable('washroom_logs', (t) => {
    t.increments('id');
    t.string('location');
    t.integer('floor').notNullable();
    t.enu('type', ['girls', 'boys']).notNullable();
    t.timestamp('cleaned_at').notNullable();
    t.string('cleaned_by');
    t.enu('cleaning_type', ['Mopping', 'Deep Cleaning', 'Flushing']);
    t.timestamp('audited_at');
    t.string('audited_by');
    t.integer('score');
    t.enu('status', ['Excellent', 'Good', 'Watch']);
    t.enu('supply_status', ['In stock', 'Attention needed']).defaultTo('In stock');
    t.string('issue');
    t.string('comments');
    t.text('checklist'); // JSON array of { item, done }
    t.string('before_photo_url');
    t.string('after_photo_url');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('washroom_logs', (t) => {
    t.index(['floor', 'type', 'cleaned_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('washroom_logs');
  await knex.schema.dropTableIfExists('notices');
  await knex.schema.dropTableIfExists('inventory_items');
  await knex.schema.dropTableIfExists('transport_routes');
  await knex.schema.dropTableIfExists('admissions');
  await knex.schema.dropTableIfExists('exam_results');
  await knex.schema.dropTableIfExists('exams');
  await knex.schema.dropTableIfExists('fees');
  await knex.schema.dropTableIfExists('timetables');
  await knex.schema.dropTableIfExists('attendance');
  await knex.schema.dropTableIfExists('staff');
  await knex.schema.dropTableIfExists('students');
};
