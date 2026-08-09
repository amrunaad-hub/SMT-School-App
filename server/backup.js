const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const LOCAL_DIR = path.join(__dirname, '../backups');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOADS_BACKUP_DIR = path.join(LOCAL_DIR, 'uploads-latest');
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS, 10) || 30;

// Mirrors server/uploads/ (admission documents, student photos) into the backup
// dir. Not timestamped per run like the DB snapshot — these files are immutable
// once uploaded, so a single up-to-date mirror (refreshed daily) is enough to
// restore from without unbounded disk growth.
function backupUploads() {
  if (!fs.existsSync(UPLOADS_DIR)) return;
  fs.cpSync(UPLOADS_DIR, UPLOADS_BACKUP_DIR, { recursive: true });
  console.log(`[Backup] Uploads mirrored: ${UPLOADS_BACKUP_DIR}`);
}

function pruneOldBackups(dir) {
  if (!fs.existsSync(dir)) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  fs.readdirSync(dir)
    .filter((f) => f.startsWith('school-') && f.endsWith('.dump'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .filter(({ mtime }) => mtime < cutoff)
    .forEach(({ f }) => {
      fs.unlinkSync(path.join(dir, f));
      console.log(`[Backup] Pruned old backup: ${path.join(dir, f)}`);
    });
}

// Uses `pg_dump -Fc` (custom format — compressed, restorable with `pg_restore`,
// and safe to take against a live database: pg_dump runs inside its own
// transaction with a consistent MVCC snapshot, so a concurrent write mid-dump
// can't produce a torn/partial backup the way a naive file copy could).
// Requires the `postgresql-client` package (provides the `pg_dump` binary) to
// be installed on whatever host runs this — see server/db/README-postgres.md.
function runBackup() {
  return new Promise((resolve, reject) => {
    const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      console.warn(`[Backup] Missing env var(s) ${missing.join(', ')} — skipping.`);
      return resolve();
    }

    if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(LOCAL_DIR, `school-${stamp}.dump`);

    const args = [
      '-h', process.env.DB_HOST,
      '-p', process.env.DB_PORT,
      '-U', process.env.DB_USER,
      '-d', process.env.DB_NAME,
      '-Fc', // custom format: compressed, restorable with pg_restore
      '--no-password', // never prompt interactively — PGPASSWORD below supplies it
      '-f', dest,
    ];
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };
    if (process.env.DB_SSL === 'true') env.PGSSLMODE = env.PGSSLMODE || 'require';

    execFile('pg_dump', args, { env }, (err, stdout, stderr) => {
      if (err) {
        // Common cause: pg_dump not installed (apt install postgresql-client).
        return reject(new Error(`pg_dump failed: ${err.message}${stderr ? ` — ${stderr}` : ''}`));
      }
      console.log(`[Backup] Local: ${dest}`);
      pruneOldBackups(LOCAL_DIR);
      backupUploads();
      resolve();
    });
  });
}

module.exports = { runBackup };
