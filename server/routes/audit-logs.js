const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRows } = require('../utils/serialize');

// Two os.cpus() snapshots ~200ms apart give a real instantaneous CPU%
// (os.loadavg() alone is a 1/5/15-min Unix load average, not a percentage,
// and reads misleadingly low/high right after a load spike).
function sampleCpuUsage() {
  const start = os.cpus();
  return new Promise((resolve) => {
    setTimeout(() => {
      const end = os.cpus();
      let idleDelta = 0;
      let totalDelta = 0;
      start.forEach((core, i) => {
        const startTotal = Object.values(core.times).reduce((a, b) => a + b, 0);
        const endTotal = Object.values(end[i].times).reduce((a, b) => a + b, 0);
        idleDelta += end[i].times.idle - core.times.idle;
        totalDelta += endTotal - startTotal;
      });
      resolve(totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 1000) / 10 : 0);
    }, 200);
  });
}

// `df` is POSIX-only — local Windows dev just gets diskUnavailable: true
// rather than a crash.
function sampleDiskUsage() {
  return new Promise((resolve) => {
    exec('df -Pk /', (err, stdout) => {
      if (err) return resolve(null);
      const dataLine = stdout.trim().split('\n')[1];
      if (!dataLine) return resolve(null);
      // Parse from the end: Mounted-on and Capacity are always last, then
      // Available/Used/1024-blocks — safer than a fixed left index since the
      // filesystem name (first column) can itself contain spaces.
      const parts = dataLine.trim().split(/\s+/);
      const [totalBytes, usedBytes, freeBytes] = parts.slice(-5, -2).map((n) => Number(n) * 1024);
      if (!Number.isFinite(totalBytes) || totalBytes === 0) return resolve(null);
      resolve({ totalBytes, usedBytes, freeBytes, usedPercent: Math.round((usedBytes / totalBytes) * 1000) / 10 });
    });
  });
}

// GET /api/audit-logs?eventType=&search=&limit= — superuser-only. Every
// login/logout, plus a brief record of every write request made anywhere
// in the app (see the global logging middleware in app.js).
router.get('/', auth, authorize(['superuser']), async (req, res) => {
  try {
    const { eventType, search, limit } = req.query;
    let query = db('audit_logs').orderBy('created_at', 'desc');
    if (eventType && eventType !== 'all') query = query.where({ event_type: eventType });
    if (search) {
      const term = `%${search}%`;
      query = query.where((qb) => {
        qb.where('username', 'like', term).orWhere('ip_address', 'like', term).orWhere('summary', 'like', term);
      });
    }
    const rows = await query.limit(Math.min(Number(limit) || 200, 1000));
    return res.json({ logs: serializeRows(rows) });
  } catch (err) {
    console.error('GET /api/audit-logs error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/audit-logs/server-stats — superuser-only. Live CPU/memory/disk
// snapshot of the machine the app is running on, for the Server Logs page.
router.get('/server-stats', auth, authorize(['superuser']), async (req, res) => {
  try {
    const [cpuUsagePercent, disk] = await Promise.all([sampleCpuUsage(), sampleDiskUsage()]);
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;

    return res.json({
      cpu: {
        cores: os.cpus().length,
        usagePercent: cpuUsagePercent,
        loadAvg: os.loadavg(),
        model: (os.cpus()[0] || {}).model || null,
      },
      memory: {
        totalBytes: totalMemBytes,
        usedBytes: usedMemBytes,
        freeBytes: freeMemBytes,
        usedPercent: Math.round((usedMemBytes / totalMemBytes) * 1000) / 10,
      },
      disk: disk || { unavailable: true },
      uptimeSeconds: os.uptime(),
      hostname: os.hostname(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GET /api/audit-logs/server-stats error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
