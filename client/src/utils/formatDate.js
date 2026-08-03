// The school and every real user are in India, but the viewing device's
// clock/timezone isn't guaranteed to be — pinning to Asia/Kolkata everywhere
// keeps timestamps stable instead of silently shifting on a misconfigured or
// non-IST device.
const IST = 'Asia/Kolkata';

export const formatDateIST = (value, opts = {}) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { timeZone: IST, ...opts });
};

export const formatDateTimeIST = (value, opts = {}) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', { timeZone: IST, ...opts });
};
