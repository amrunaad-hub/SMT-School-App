// Shared mandatory-field rules for the admission -> student pipeline, matching
// the reference ERP's required-field set (see the "ERP parity" plan). Applied
// at two different stages since not every mandatory field is knowable at the
// same point: a parent submitting the public form doesn't have a school-issued
// admission form number yet, and an office admin approving doesn't need to
// re-enter what the parent already submitted.
//
// Returns an array of missing-field messages (empty if none) rather than
// throwing on the first miss, so a submitter sees everything wrong at once.

function guardiansFromInput({ guardians, guardiansDraft }) {
  if (Array.isArray(guardians) && guardians.length) return guardians;
  if (guardiansDraft) {
    try {
      const parsed = typeof guardiansDraft === 'string' ? JSON.parse(guardiansDraft) : guardiansDraft;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to empty
    }
  }
  return [];
}

function hasPrimaryGuardian(guardianInputs) {
  const primary = guardianInputs.find((g) => g && g.isPrimary) || guardianInputs[0];
  return !!(primary && primary.fullName && String(primary.fullName).trim() && primary.mobile && String(primary.mobile).trim());
}

// Public-submit stage: what a parent can reasonably be expected to know online.
function validatePublicSubmitMandatory(admission) {
  const missing = [];
  if (!admission.child_name || !String(admission.child_name).trim()) missing.push("Child's Name");
  if (!admission.dob) missing.push('Date of Birth');
  if (!admission.gender) missing.push('Gender');
  if (!admission.current_school || !String(admission.current_school).trim()) missing.push('Previous/Current School Name');
  if (!admission.previous_school_board || !String(admission.previous_school_board).trim()) missing.push('Previous School Board');
  if (!hasPrimaryGuardian(guardiansFromInput({ guardiansDraft: admission.guardians_draft }))) {
    missing.push("Primary Guardian's Name and Mobile Number");
  }
  return missing;
}

// Approve stage: office-assigned fields the parent never enters, plus a
// re-check of the guardian rule in case an admin overrides the draft guardians.
function validateApproveMandatory({ admissionFormNo, admissionDate, guardians, admission }) {
  const missing = [];
  if (!admissionFormNo || !String(admissionFormNo).trim()) missing.push('Admission Form No');
  if (!admissionDate) missing.push('Admission Date');
  if (!hasPrimaryGuardian(guardiansFromInput({ guardians, guardiansDraft: admission && admission.guardians_draft }))) {
    missing.push("Primary Guardian's Name and Mobile Number");
  }
  return missing;
}

module.exports = { validatePublicSubmitMandatory, validateApproveMandatory, guardiansFromInput, hasPrimaryGuardian };
