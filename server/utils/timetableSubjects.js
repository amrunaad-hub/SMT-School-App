// Resolves subjects from the weekly `timetables` template for a grade/division
// — shared by period-notes routes that need to label a note with its subject
// (the note itself only stores periodIndex/date, not the subject name).

// Returns a cached (date, periodIndex) -> subject lookup, backed by the
// timetable's day-of-week row (a week's periods repeat for every matching
// weekday, so caching per day-of-week is enough even across a year of dates).
function makeSubjectResolver(db, grade, division) {
  const cache = {};
  return async function subjectFor(date, periodIndex) {
    const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (jsDay === 0) return null;
    if (!(jsDay in cache)) {
      cache[jsDay] = await db('timetables').where({ grade, division, day_of_week: jsDay }).first();
    }
    const row = cache[jsDay];
    if (!row) return null;
    const periods = JSON.parse(row.periods || '[]');
    const period = periods.find((p) => p.periodIndex === periodIndex);
    return period ? period.subject : null;
  };
}

// Distinct real subjects (Assembly/Break excluded) taught to a grade/division
// across the whole week, for populating a subject picker.
async function listSubjects(db, grade, division) {
  const rows = await db('timetables').where({ grade, division });
  const subjects = new Set();
  rows.forEach((row) => {
    JSON.parse(row.periods || '[]').forEach((p) => {
      if (p.subject && p.type !== 'Assembly' && p.type !== 'Break') subjects.add(p.subject);
    });
  });
  return [...subjects].sort();
}

module.exports = { makeSubjectResolver, listSubjects };
