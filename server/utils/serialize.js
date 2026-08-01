// Converts a snake_case SQLite row into the same camelCase shape the old Mongoose
// models produced, so the frontend (which reads e.g. `student.firstName`,
// `student._id`) needs no changes after the Mongo -> SQLite migration.
//
// jsonFields: column names whose value is a JSON-text blob to parse back into an
//             array/object (e.g. Mongoose sub-document arrays like `periods`, `stops`).
// boolFields: column names stored as SQLite 0/1 that should serialize as true/false.
function toCamelKey(key) {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function serializeRow(row, { jsonFields = [], boolFields = [], jsonDefault = [] } = {}) {
  if (!row) return row;
  const out = { _id: String(row.id) };
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamelKey(key);
    if (jsonFields.includes(key)) {
      if (value == null || value === '') { out[camelKey] = jsonDefault; continue; }
      try { out[camelKey] = JSON.parse(value); } catch { out[camelKey] = jsonDefault; }
    } else if (boolFields.includes(key)) {
      out[camelKey] = !!value;
    } else {
      out[camelKey] = value;
    }
  }
  return out;
}

function serializeRows(rows, opts) {
  return (rows || []).map((r) => serializeRow(r, opts));
}

module.exports = { serializeRow, serializeRows };
