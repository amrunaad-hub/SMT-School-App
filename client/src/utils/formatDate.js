// The school and every real user are in India, but the viewing device's
// clock/timezone isn't guaranteed to be — pinning to Asia/Kolkata everywhere
// keeps dates stable instead of silently shifting a day for a misconfigured
// or non-IST device.
const IST = 'Asia/Kolkata';
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// App-wide standard date format: DD-MON-YYYY (e.g. "04-AUG-2026"). Every
// read-only date display in the app should go through this — native
// <input type="date"> pickers are the one exception (the browser controls
// their format, not us).
export const formatDateDMY = (value, { withWeekday = false } = {}) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric', weekday: withWeekday ? 'long' : undefined, timeZone: IST })
    .formatToParts(d);
  const day = parts.find((p) => p.type === 'day').value;
  const month = parts.find((p) => p.type === 'month').value;
  const year = parts.find((p) => p.type === 'year').value;
  const dateStr = `${day}-${MONTH_ABBR[Number(month) - 1]}-${year}`;
  if (!withWeekday) return dateStr;
  const weekday = parts.find((p) => p.type === 'weekday')?.value
    || WEEKDAY_NAME[new Date(`${year}-${month}-${day}T12:00:00+05:30`).getDay()];
  return `${weekday}, ${dateStr}`;
};

// Same standard date format, plus a time-of-day suffix for real timestamps
// (submitted/approved/generated-on, etc.) — e.g. "04-AUG-2026, 10:30 AM".
export const formatDateTimeDMY = (value, opts = {}) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = formatDateDMY(value, opts);
  const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST });
  return `${datePart}, ${timePart}`;
};

// Kept for call sites that need a non-standard/custom Intl.DateTimeFormat
// shape (month-only headers, weekday-only labels) rather than the DD-MON-YYYY
// standard above — still pinned to IST for the same reason.
export const formatDateIST = (value, opts = {}) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { timeZone: IST, ...opts });
};

export const formatDateTimeIST = (value, opts = {}) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', { timeZone: IST, ...opts });
};
