const express = require('express');
const os = require('os');
const path = require('path');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRows } = require('../utils/serialize');
const { sampleCpuUsage, sampleAppCpuUsage, sampleDiskUsage, sampleAppDiskBreakdown } = require('../utils/serverStats');

const APP_ROOT = path.join(__dirname, '../..');

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
    const [cpuUsagePercent, appCpuUsagePercent, disk, appDisk] = await Promise.all([
      sampleCpuUsage(), sampleAppCpuUsage(), sampleDiskUsage(), sampleAppDiskBreakdown(APP_ROOT),
    ]);
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const appMemBytes = process.memoryUsage().rss;

    return res.json({
      cpu: {
        cores: os.cpus().length,
        usagePercent: cpuUsagePercent,
        appUsagePercent: appCpuUsagePercent,
        loadAvg: os.loadavg(),
        model: (os.cpus()[0] || {}).model || null,
      },
      memory: {
        totalBytes: totalMemBytes,
        usedBytes: usedMemBytes,
        freeBytes: freeMemBytes,
        usedPercent: Math.round((usedMemBytes / totalMemBytes) * 1000) / 10,
        appBytes: appMemBytes,
        appPercent: Math.round((appMemBytes / totalMemBytes) * 1000) / 10,
      },
      disk: disk ? {
        ...disk,
        // Everything outside the app's own directory tree (Ubuntu base, snap
        // packages, system logs, Google Ops Agent) — inferred as the
        // remainder rather than enumerated, since those paths aren't
        // something this app controls.
        breakdown: { ...appDisk, osBytes: Math.max(disk.usedBytes - appDisk.total, 0) },
      } : { unavailable: true },
      uptimeSeconds: os.uptime(),
      hostname: os.hostname(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GET /api/audit-logs/server-stats error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

const RANGE_CONFIG = {
  hour: { intervalMinutes: 60, bucketFormat: '%Y-%m-%d %H:%M' },   // raw minute samples
  day: { intervalMinutes: 24 * 60, bucketFormat: '%Y-%m-%d %H:00' }, // hourly
  week: { intervalMinutes: 7 * 24 * 60, bucketFormat: '%Y-%m-%d %H:00' }, // hourly
  month: { intervalMinutes: 31 * 24 * 60, bucketFormat: '%Y-%m-%d' }, // daily
};

// GET /api/audit-logs/server-stats/history?range=hour|day|week|month —
// superuser-only. Bucketed CPU/memory trend from resource_samples (written
// once a minute by server/cron/resourceSampler.js), one point per bucket.
router.get('/server-stats/history', auth, authorize(['superuser']), async (req, res) => {
  try {
    const range = RANGE_CONFIG[req.query.range] ? req.query.range : 'day';
    const { intervalMinutes, bucketFormat } = RANGE_CONFIG[range];
    const sinceIso = new Date(Date.now() - intervalMinutes * 60 * 1000).toISOString();

    const rows = await db('resource_samples')
      .where('sampled_at', '>=', sinceIso)
      .select(
        db.raw(`strftime('${bucketFormat}', sampled_at) as bucket`),
        db.raw('avg(cpu_percent) as avg_cpu'),
        db.raw('max(cpu_percent) as max_cpu'),
        db.raw('avg(app_cpu_percent) as avg_app_cpu'),
        db.raw('avg(mem_used_bytes * 100.0 / mem_total_bytes) as avg_mem_percent'),
        db.raw('avg(app_mem_bytes * 100.0 / mem_total_bytes) as avg_app_mem_percent'),
        db.raw('max(disk_used_bytes * 100.0 / disk_total_bytes) as disk_percent'),
      )
      .groupBy('bucket')
      .orderBy('bucket', 'asc');

    return res.json({
      range,
      points: rows.map((r) => ({
        bucket: r.bucket,
        cpuPercent: r.avg_cpu != null ? Math.round(r.avg_cpu * 10) / 10 : null,
        cpuPeakPercent: r.max_cpu != null ? Math.round(r.max_cpu * 10) / 10 : null,
        appCpuPercent: r.avg_app_cpu != null ? Math.round(r.avg_app_cpu * 10) / 10 : null,
        memPercent: r.avg_mem_percent != null ? Math.round(r.avg_mem_percent * 10) / 10 : null,
        appMemPercent: r.avg_app_mem_percent != null ? Math.round(r.avg_app_mem_percent * 10) / 10 : null,
        diskPercent: r.disk_percent != null ? Math.round(r.disk_percent * 10) / 10 : null,
      })),
    });
  } catch (err) {
    console.error('GET /api/audit-logs/server-stats/history error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
