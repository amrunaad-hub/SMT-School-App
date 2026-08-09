// One-off data migration: copies every row from an existing SQLite school.db
// into the Postgres database configured via env vars (see ../database.js).
//
// Usage:  node server/db/migrate-to-postgres.js [path/to/school.db]
//   - Defaults to <project root>/school.db if no path given.
//   - Postgres connection comes from the same DB_HOST/DB_PORT/DB_USER/
//     DB_PASSWORD/DB_NAME/DB_SSL env vars the app itself uses (.env).
//
// Prerequisites:
//   1. Take a SQLite backup first (VACUUM INTO) — this script only READS
//      the SQLite file, never writes to it, but back it up anyway.
//   2. Run migrations against the target Postgres DB first (`db.migrate.latest()`,
//      e.g. by starting the server once against it) so every table already
//      exists with the right schema. This script does NOT create tables.
//   3. The target Postgres tables should be EMPTY. This script does not
//      merge/upsert — it truncates each table before loading (see below) so
//      it's safe to re-run, but it is NOT meant to layer onto real Postgres
//      data you want to keep.
//
// How it handles the circular FK between students <-> admissions
// (students.admission_id -> admissions.id, admissions.student_id ->
// students.id): Postgres FK constraints are checked per-statement by
// default, which would reject loading either table first. Fixed by running
// the whole load with `session_replication_role = replica` (Postgres's
// standard bulk-load technique — disables FK/trigger enforcement for this
// session only, not globally), so table order doesn't matter. Re-enabled
// before the script exits either way (including on error).
const path = require('path');
const sqlite3 = require('sqlite3');

const sqlitePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '../../school.db');

async function main() {
  const pg = require('./database'); // Postgres, per .env — see prerequisites above
  if (pg.client.config.client !== 'pg') {
    throw new Error('Target DB (server/db/database.js) is not configured for Postgres — check your .env');
  }

  const sqlite = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    sqlite.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  const tableRows = await all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%'"
  );
  const tables = tableRows.map((r) => r.name);
  console.log(`Found ${tables.length} tables in ${sqlitePath}`);

  // Per-table boolean columns, discovered from SQLite's own column types —
  // SQLite returns these as 0/1; Postgres needs real true/false (the pg
  // driver does NOT reliably coerce 0/1 for boolean columns the way you'd
  // hope, so this is done explicitly rather than trusted to happen automatically).
  const boolColumns = {};
  for (const table of tables) {
    const cols = await all(`PRAGMA table_info(${table})`);
    boolColumns[table] = cols.filter((c) => c.type === 'boolean').map((c) => c.name);
  }

  await pg.raw('SET session_replication_role = replica');

  const counts = {};
  try {
    for (const table of tables) {
      const rows = await all(`SELECT * FROM ${table}`);
      counts[table] = { source: rows.length };

      await pg(table).del(); // safe to re-run; not an upsert/merge onto real data

      if (rows.length === 0) { counts[table].loaded = 0; continue; }

      const bools = boolColumns[table];
      const transformed = rows.map((row) => {
        const out = { ...row };
        for (const col of bools) {
          if (out[col] !== null && out[col] !== undefined) out[col] = !!out[col];
        }
        return out;
      });

      // Batch in chunks — some tables (students, admissions) have 50+ columns
      // and a single giant multi-row INSERT can hit statement size limits.
      const CHUNK = 200;
      let loaded = 0;
      for (let i = 0; i < transformed.length; i += CHUNK) {
        await pg(table).insert(transformed.slice(i, i + CHUNK));
        loaded += transformed.slice(i, i + CHUNK).length;
      }
      counts[table].loaded = loaded;
      console.log(`  ${table}: ${loaded}/${rows.length} rows`);
    }
  } finally {
    await pg.raw('SET session_replication_role = origin');
  }

  // Every table uses knex's `.increments('id')` (SERIAL) — since rows were
  // inserted with their original explicit ids, the sequence doesn't know to
  // continue after the highest one. Without this, the next INSERT (no id
  // given, e.g. from the app itself) reuses an already-taken id and fails.
  console.log('\nResetting SERIAL sequences...');
  for (const table of tables) {
    await pg.raw(
      `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE((SELECT MAX(id) FROM ??), 1), (SELECT MAX(id) FROM ??) IS NOT NULL)`,
      [table, table, table]
    );
  }

  console.log('\n=== Row count verification ===');
  let allMatch = true;
  for (const table of tables) {
    const { source, loaded } = counts[table];
    const ok = source === loaded;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? 'OK  ' : 'MISMATCH'} ${table}: source=${source} loaded=${loaded}`);
  }

  sqlite.close();
  await pg.destroy();

  if (!allMatch) {
    console.error('\nRow count mismatch on at least one table — investigate before trusting this data.');
    process.exit(1);
  }
  console.log('\nAll tables migrated with matching row counts.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
