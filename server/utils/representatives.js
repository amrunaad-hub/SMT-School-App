const db = require('../db/database');

// A guardian's ward's division within a given grade — used to derive which
// division a newly-assigned PTA rep defaults to. Picks the primary-guardian
// link first if the guardian has more than one child in the grade (rare:
// siblings in the same grade would be in different divisions per the
// students.grade+division+roll_no uniqueness), else the first match.
async function findWardDivision(executor, guardianId, grade) {
  const rows = await executor('student_guardians')
    .join('students', 'students.id', 'student_guardians.student_id')
    .where({ 'student_guardians.guardian_id': guardianId, 'students.grade': grade })
    .select('students.division', 'student_guardians.is_primary')
    .orderBy('student_guardians.is_primary', 'desc');
  return rows[0]?.division || null;
}

// Everything a logged-in parent needs to know about their own rep status —
// used both to gate the PTA/CR compose tab and to clamp what audience they
// may target when sending a notice.
async function getRepresentativeScope(userId) {
  const guardian = await db('guardians').where({ user_id: userId }).first();
  if (!guardian) return { isPta: false, ptaGrade: null, classRepScopes: [] };

  const [ptaRow, classRepRows] = await Promise.all([
    db('pta_representatives').where({ guardian_id: guardian.id }).first(),
    db('class_representatives').where({ guardian_id: guardian.id }).select('grade', 'division', 'is_pta_default'),
  ]);

  return {
    isPta: !!ptaRow,
    ptaGrade: ptaRow ? ptaRow.grade : null,
    // Every division this guardian is CR for, including their PTA-default
    // one — a rep composing a notice only ever needs "which grade/divisions
    // can I reach," not why.
    classRepScopes: classRepRows.map((r) => ({ grade: r.grade, division: r.division })),
  };
}

// Assigns (or reassigns) the PTA rep for a grade, syncing the default
// class_representatives row for their ward's division. Throws a plain Error
// with a user-facing message on conflict — callers turn that into a 409.
async function assignPta(grade, guardianId) {
  const ward = await findWardDivision(db, guardianId, grade);
  if (!ward) {
    throw new Error('This parent has no child in this grade, so they cannot be PTA rep for it.');
  }

  return db.transaction(async (trx) => {
    const conflict = await trx('class_representatives')
      .where({ grade, division: ward, is_pta_default: false })
      .first();
    if (conflict && conflict.guardian_id !== guardianId) {
      throw new Error(`Grade ${grade} ${ward} already has a manually-assigned class representative — reassign or remove that one first.`);
    }

    const previousPta = await trx('pta_representatives').where({ grade }).first();
    if (previousPta && previousPta.guardian_id !== guardianId) {
      // Clean up the outgoing PTA's auto-default CR row, but only if it's
      // still theirs by default (an admin may have since manually
      // reassigned that division to someone else, which conflict-guard
      // above would have already caught if it collided with the new PTA's
      // own division — this only fires for the *old* PTA's division).
      await trx('class_representatives')
        .where({ grade, guardian_id: previousPta.guardian_id, is_pta_default: true })
        .del();
    }

    const now = new Date().toISOString();
    await trx('pta_representatives')
      .insert({ grade, guardian_id: guardianId, created_at: now, updated_at: now })
      .onConflict('grade').merge({ guardian_id: guardianId, updated_at: now });

    await trx('class_representatives')
      .insert({ grade, division: ward, guardian_id: guardianId, is_pta_default: true, created_at: now, updated_at: now })
      .onConflict(['grade', 'division']).merge({ guardian_id: guardianId, is_pta_default: true, updated_at: now });
  });
}

async function removePta(grade) {
  return db.transaction(async (trx) => {
    const pta = await trx('pta_representatives').where({ grade }).first();
    if (!pta) return;
    await trx('class_representatives').where({ grade, guardian_id: pta.guardian_id, is_pta_default: true }).del();
    await trx('pta_representatives').where({ grade }).del();
  });
}

// Manually assigns a class rep for one of the two divisions not already
// covered by the grade's PTA-by-default. Rejects targeting the PTA's own
// division directly — reassign the PTA instead, so there's only ever one
// place (assignPta) that writes a PTA-default row.
async function assignClassRep(grade, division, guardianId) {
  const ward = await findWardDivision(db, guardianId, grade);
  if (ward !== division) {
    throw new Error('This parent\'s child is not in that grade/division.');
  }

  const existing = await db('class_representatives').where({ grade, division }).first();
  if (existing && existing.is_pta_default) {
    throw new Error(`Grade ${grade} ${division} is already covered by default by this grade's PTA rep — reassign the PTA if you need someone else here.`);
  }

  const now = new Date().toISOString();
  await db('class_representatives')
    .insert({ grade, division, guardian_id: guardianId, is_pta_default: false, created_at: now, updated_at: now })
    .onConflict(['grade', 'division']).merge({ guardian_id: guardianId, is_pta_default: false, updated_at: now });
}

async function removeClassRep(grade, division) {
  const existing = await db('class_representatives').where({ grade, division }).first();
  if (existing && existing.is_pta_default) {
    throw new Error('This division is covered by the PTA rep by default — remove the PTA assignment instead.');
  }
  await db('class_representatives').where({ grade, division }).del();
}

// Collapses a rep's scope into the same gradeSelections shape the audience
// picker/matcher already uses: one entry per grade, allDivisions=true if
// held via PTA (which covers the whole grade), else the specific division(s)
// held via manual class-rep assignment.
function scopeToAllowedGradeDivisions(scope) {
  const byGrade = {};
  if (scope.isPta && scope.ptaGrade) {
    byGrade[scope.ptaGrade] = { grade: scope.ptaGrade, allDivisions: true, divisions: [] };
  }
  (scope.classRepScopes || []).forEach(({ grade, division }) => {
    if (byGrade[grade]?.allDivisions) return;
    if (!byGrade[grade]) byGrade[grade] = { grade, allDivisions: false, divisions: [] };
    if (!byGrade[grade].divisions.includes(division)) byGrade[grade].divisions.push(division);
  });
  return Object.values(byGrade);
}

// True if a notice's targetAudience (gradeSelections shape) never reaches
// outside what this rep is allowed to reach — no all-grades/all-teachers/
// named-teachers, and every grade+division named is within their scope.
// studentIds aren't checked here (needs a DB lookup) — callers validate
// those separately.
function audienceWithinScope(scope, audience) {
  if (!audience || audience.allGrades) return false;
  if (audience.allTeachers || (audience.teacherIds || []).length > 0) return false;

  const allowed = scopeToAllowedGradeDivisions(scope);
  const allowedByGrade = {};
  allowed.forEach((a) => { allowedByGrade[a.grade] = a; });

  const gradeSelections = audience.gradeSelections || [];
  if (gradeSelections.length === 0) return false;
  return gradeSelections.every((gs) => {
    const a = allowedByGrade[gs.grade];
    if (!a) return false;
    if (a.allDivisions) return true;
    if (gs.allDivisions) return false;
    return (gs.divisions || []).every((d) => a.divisions.includes(d));
  });
}

module.exports = {
  getRepresentativeScope, assignPta, removePta, assignClassRep, removeClassRep,
  scopeToAllowedGradeDivisions, audienceWithinScope,
};
