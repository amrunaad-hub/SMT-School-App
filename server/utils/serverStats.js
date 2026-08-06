// Shared by the live-snapshot route (server/routes/audit-logs.js) and the
// per-minute background sampler (server/cron/resourceSampler.js) — one
// implementation of "what does CPU/memory/disk usage actually look like
// right now," not two copies drifting apart.
const os = require('os');
const { exec } = require('child_process');

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

// This Node process's own CPU usage as a percent of total machine capacity
// (not just this process's own single-core percent) — same 200ms window and
// core count as sampleCpuUsage() above, so the two are directly comparable
// ("the app is N% of the M% total").
function sampleAppCpuUsage() {
  const cores = os.cpus().length || 1;
  const start = process.cpuUsage();
  const startTime = process.hrtime.bigint();
  return new Promise((resolve) => {
    setTimeout(() => {
      const delta = process.cpuUsage(start); // microseconds, user+system
      const elapsedMicros = Number(process.hrtime.bigint() - startTime) / 1000;
      const usedMicros = delta.user + delta.system;
      const pct = elapsedMicros > 0 ? (usedMicros / (elapsedMicros * cores)) * 100 : 0;
      resolve(Math.round(pct * 10) / 10);
    }, 200);
  });
}

// `df`/`du` are POSIX-only — local Windows dev just gets null rather than a crash.
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

// du -sb on a handful of app-relevant paths, for the "what's actually using
// this" breakdown — everything else on disk (Ubuntu base, snap packages,
// system logs, Google Ops Agent) is inferred as the remainder rather than
// enumerated, since those aren't paths this app controls or cares about.
function duBytes(targetPath) {
  return new Promise((resolve) => {
    exec(`du -sb "${targetPath}" 2>/dev/null`, (err, stdout) => {
      if (err) return resolve(0);
      const bytes = Number(stdout.trim().split(/\s+/)[0]);
      resolve(Number.isFinite(bytes) ? bytes : 0);
    });
  });
}

async function sampleAppDiskBreakdown(appRoot) {
  const path = require('path');
  const [code, nodeModules, clientNodeModules, database, uploads, backups] = await Promise.all([
    duBytes(path.join(appRoot, 'server')),
    duBytes(path.join(appRoot, 'node_modules')),
    duBytes(path.join(appRoot, 'client', 'node_modules')),
    duBytes(path.join(appRoot, 'school.db')),
    duBytes(path.join(appRoot, 'server', 'uploads')),
    duBytes(path.join(appRoot, 'backups')),
  ]);
  const total = code + nodeModules + clientNodeModules + database + uploads + backups;
  return { code, nodeModules: nodeModules + clientNodeModules, database, uploads, backups, total };
}

module.exports = { sampleCpuUsage, sampleAppCpuUsage, sampleDiskUsage, sampleAppDiskBreakdown };
