const cron = require('node-cron');
const os = require('os');
const db = require('../db/database');
const { sampleCpuUsage, sampleAppCpuUsage, sampleDiskUsage } = require('../utils/serverStats');

async function takeSample() {
  try {
    const [cpuPercent, appCpuPercent, disk] = await Promise.all([sampleCpuUsage(), sampleAppCpuUsage(), sampleDiskUsage()]);
    await db('resource_samples').insert({
      sampled_at: new Date().toISOString(),
      cpu_percent: cpuPercent,
      app_cpu_percent: appCpuPercent,
      mem_used_bytes: os.totalmem() - os.freemem(),
      mem_total_bytes: os.totalmem(),
      app_mem_bytes: process.memoryUsage().rss,
      disk_used_bytes: disk ? disk.usedBytes : null,
      disk_total_bytes: disk ? disk.totalBytes : null,
    });
  } catch (err) {
    console.error('[ResourceSampler] sample failed:', err.message);
  }
}

function startResourceSampler() {
  takeSample(); // one immediate sample on boot, then every minute on the clock
  cron.schedule('* * * * *', takeSample);
  console.log('[Cron] Resource usage sampled every minute — see /audit-logs Server Logs page.');
}

module.exports = { startResourceSampler };
