const db = require('../db/database');

// Best-effort — an audit-log write failing must never break the actual
// request it's describing.
async function logAudit({ eventType, userId, username, role, ip, method, path, summary }) {
  try {
    await db('audit_logs').insert({
      event_type: eventType,
      user_id: userId ?? null,
      username: username || null,
      role: role || null,
      ip_address: ip || null,
      method: method || null,
      path: path || null,
      summary: summary || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[audit] failed to log event:', err.message);
  }
}

module.exports = { logAudit };
