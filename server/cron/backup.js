const cron = require('node-cron');
const { runBackup } = require('../backup');

function startBackupCron() {
  // Run a backup immediately on server start
  runBackup().catch((e) => console.error('[Backup] Startup backup failed:', e.message));

  // Daily backup at 02:00 AM
  cron.schedule('0 2 * * *', () => {
    runBackup().catch((e) => console.error('[Backup] Scheduled backup failed:', e.message));
  });

  console.log('[Cron] Daily backup scheduled at 02:00 AM — snapshots stored in /backups/');
}

module.exports = { startBackupCron };
