// Server-side mirror of client/src/utils/calendarHelpers.js's isWorkingDayFor —
// a CommonJS Express app can't import that ESM client util directly, so this
// is a deliberate second copy of the same Sunday + 2nd/4th-Saturday-off rule.
// Keep both in sync if the rule ever changes.

// date is parsed as UTC midnight (see isWorkingDayFor) so this reads UTC fields.
function getSaturdayOccurrence(date) {
  return Math.floor((date.getUTCDate() - 1) / 7) + 1;
}

// dateStr is 'YYYY-MM-DD'; parsed as UTC midnight so the weekday doesn't
// shift with the server's local timezone.
function isWorkingDayFor(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  if (day === 0) return false;
  if (day === 6) return ![2, 4].includes(getSaturdayOccurrence(date));
  return true;
}

module.exports = { isWorkingDayFor, getSaturdayOccurrence };
