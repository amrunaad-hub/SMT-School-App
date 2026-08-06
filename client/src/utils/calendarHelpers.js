// Pure date-navigation helpers, extracted from the (working, but component-local)
// calendar UI already built in client/src/components/Parents.jsx. Used by
// Teachers.jsx / PeriodDetails.jsx / Timetable.jsx for the same day-strip +
// month-grid navigation pattern, without duplicating the math per component.

export const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isSameDate = (left, right) => formatDateKey(left) === formatDateKey(right);

export function generateCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i += 1) days.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) days.push(new Date(year, month, i));
  return days;
}

export function buildWeekStrip(selectedDate) {
  const start = new Date(selectedDate);
  start.setDate(selectedDate.getDate() - selectedDate.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

// Mon=1 ... Sat=6 (matches server timetables.day_of_week); Sunday -> null.
export function jsDayToApiDay(jsDay) {
  return jsDay === 0 ? null : jsDay;
}

// Which occurrence of its weekday this date is within its month (1st, 2nd, ...) —
// used below to single out the 2nd/4th Saturday of the month as non-working.
export function getSaturdayOccurrence(date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

// Sunday off, 2nd/4th Saturday off, everything else a working day. Mirrored
// server-side in server/utils/workingDay.js (a Node/Express CommonJS app
// can't import this ESM client util directly) — keep both in sync if this
// rule ever changes.
export function isWorkingDayFor(date) {
  const day = date.getDay();
  if (day === 0) return false;
  if (day === 6) return ![2, 4].includes(getSaturdayOccurrence(date));
  return true;
}
