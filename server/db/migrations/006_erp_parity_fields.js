// Brings the student/admission data model to field-parity with a reference ERP
// (Edusoft) the user is migrating away from — birth/identity detail, extended
// previous-school detail, guardian qualification/office-address/contribution
// areas, and admission-record specifics (form number, admission date). See
// C:\Users\aplus\.claude\plans\shimmying-beaming-swan.md for the full field
// inventory and mandatory-field rationale.
//
// `admissions` mirrors most of the new `students` columns so the public
// admission form has somewhere to stage this data pre-approval (same reasoning
// as migration 004) — `copyAdmissionToStudentFields` in admissions.js copies
// these across at approve time.
const PERSONAL_IDENTITY_COLUMNS = (t) => {
  t.string('middle_name');
  t.string('religion');
  t.string('caste');
  t.string('sub_caste');
  t.string('category');
  t.string('nationality').defaultTo('Indian');
  t.string('mother_tongue');
  t.string('birth_place');
  t.string('birth_taluka');
  t.string('birth_district');
  t.string('birth_state');
  t.text('native_address');
  t.string('student_saral_no');
  t.string('gr_no');
  t.string('pen_no');
  t.string('aadhar_number'); // sensitive PII — govt national ID, not encrypted (matches existing plaintext treatment of blood_group/medical_* on this table)
  t.string('apaar_id');
  t.float('height_cm');
  t.float('weight_kg');
  t.string('student_email');
  t.string('student_mobile');
  t.string('handicap_type');
  t.text('siblings_declared'); // JSON array of { name, standard, relation } — free-text, separate from guardian-linkage-based sibling inference
};

const PREVIOUS_SCHOOL_EXTENDED_COLUMNS = (t) => {
  t.string('previous_school_pass_year');
  t.string('previous_school_seat_number');
  t.float('previous_school_percentage');
  t.string('previous_school_lc_number');
  t.date('previous_school_lc_date');
  t.date('previous_school_leave_date');
  t.text('previous_school_remarks');
  t.string('previous_school_reason_leave');
  t.string('previous_school_medium');
};

exports.up = async function (knex) {
  await knex.schema.alterTable('students', (t) => {
    PERSONAL_IDENTITY_COLUMNS(t);
    PREVIOUS_SCHOOL_EXTENDED_COLUMNS(t);
    t.date('admission_date'); // distinct from the existing coarse admission_year integer
  });

  await knex.schema.alterTable('admissions', (t) => {
    PERSONAL_IDENTITY_COLUMNS(t);
    PREVIOUS_SCHOOL_EXTENDED_COLUMNS(t);
    t.enu('gender', ['Male', 'Female']); // was missing entirely on admissions
    t.string('previous_school_board'); // students-only until now
    t.string('admission_form_no');
    t.date('admission_date');
    t.text('guardians_draft'); // JSON array — public form's staged Father/Mother/Guardian entries, same shape POST /:id/approve's `guardians` override already accepts
  });

  await knex.schema.alterTable('guardians', (t) => {
    t.string('qualification');
    t.text('office_address');
    t.text('contribution_areas'); // JSON array: Singing/Dance/Media/Debates/Sports/Drawing/Poetry/Other + free-text note
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('guardians', (t) => {
    t.dropColumn('qualification');
    t.dropColumn('office_address');
    t.dropColumn('contribution_areas');
  });

  await knex.schema.alterTable('admissions', (t) => {
    t.dropColumn('middle_name');
    t.dropColumn('religion');
    t.dropColumn('caste');
    t.dropColumn('sub_caste');
    t.dropColumn('category');
    t.dropColumn('nationality');
    t.dropColumn('mother_tongue');
    t.dropColumn('birth_place');
    t.dropColumn('birth_taluka');
    t.dropColumn('birth_district');
    t.dropColumn('birth_state');
    t.dropColumn('native_address');
    t.dropColumn('student_saral_no');
    t.dropColumn('gr_no');
    t.dropColumn('pen_no');
    t.dropColumn('aadhar_number');
    t.dropColumn('apaar_id');
    t.dropColumn('height_cm');
    t.dropColumn('weight_kg');
    t.dropColumn('student_email');
    t.dropColumn('student_mobile');
    t.dropColumn('handicap_type');
    t.dropColumn('siblings_declared');
    t.dropColumn('previous_school_pass_year');
    t.dropColumn('previous_school_seat_number');
    t.dropColumn('previous_school_percentage');
    t.dropColumn('previous_school_lc_number');
    t.dropColumn('previous_school_lc_date');
    t.dropColumn('previous_school_leave_date');
    t.dropColumn('previous_school_remarks');
    t.dropColumn('previous_school_reason_leave');
    t.dropColumn('previous_school_medium');
    t.dropColumn('gender');
    t.dropColumn('previous_school_board');
    t.dropColumn('admission_form_no');
    t.dropColumn('admission_date');
    t.dropColumn('guardians_draft');
  });

  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('middle_name');
    t.dropColumn('religion');
    t.dropColumn('caste');
    t.dropColumn('sub_caste');
    t.dropColumn('category');
    t.dropColumn('nationality');
    t.dropColumn('mother_tongue');
    t.dropColumn('birth_place');
    t.dropColumn('birth_taluka');
    t.dropColumn('birth_district');
    t.dropColumn('birth_state');
    t.dropColumn('native_address');
    t.dropColumn('student_saral_no');
    t.dropColumn('gr_no');
    t.dropColumn('pen_no');
    t.dropColumn('aadhar_number');
    t.dropColumn('apaar_id');
    t.dropColumn('height_cm');
    t.dropColumn('weight_kg');
    t.dropColumn('student_email');
    t.dropColumn('student_mobile');
    t.dropColumn('handicap_type');
    t.dropColumn('siblings_declared');
    t.dropColumn('previous_school_pass_year');
    t.dropColumn('previous_school_seat_number');
    t.dropColumn('previous_school_percentage');
    t.dropColumn('previous_school_lc_number');
    t.dropColumn('previous_school_lc_date');
    t.dropColumn('previous_school_leave_date');
    t.dropColumn('previous_school_remarks');
    t.dropColumn('previous_school_reason_leave');
    t.dropColumn('previous_school_medium');
    t.dropColumn('admission_date');
  });
};
