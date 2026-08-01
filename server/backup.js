const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

// DB_PATH must match server/db/database.js's resolution exactly.
const DB_PATH = process.env.DB_PATH
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, '..', process.env.DB_PATH))
  : path.join(__dirname, '../school.db');

const LOCAL_DIR = path.join(__dirname, '../backups');
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS, 10) || 30;

function pruneOldBackups(dir) {
  if (!fs.existsSync(dir)) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  fs.readdirSync(dir)
    .filter((f) => f.startsWith('school-') && f.endsWith('.db'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .filter(({ mtime }) => mtime < cutoff)
    .forEach(({ f }) => {
      fs.unlinkSync(path.join(dir, f));
      console.log(`[Backup] Pruned old backup: ${path.join(dir, f)}`);
    });
}

// Uses VACUUM INTO rather than a plain file copy — school.db runs in WAL mode
// (see server/db/database.js), so a plain fs.copyFileSync can silently miss
// recent transactions still sitting in the -wal file. VACUUM INTO atomically
// merges the WAL and produces a complete, consistent snapshot regardless of
// concurrent activity.
function runBackup() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)) {
      console.warn('[Backup] school.db not found — skipping.');
      return resolve();
    }

    if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(LOCAL_DIR, `school-${stamp}.db`);

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
      db.run('VACUUM INTO ?', [dest], (vacErr) => {
        db.close();
        if (vacErr) return reject(vacErr);
        console.log(`[Backup] Local: ${dest}`);
        pruneOldBackups(LOCAL_DIR);
        resolve();
      });
    });
  });
}

module.exports = { runBackup };
