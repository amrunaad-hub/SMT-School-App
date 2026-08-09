# Postgres setup — SMT School App

The app now runs on Postgres (was SQLite). Connection is entirely env-driven —
see `.env.example` at the project root. This doc covers provisioning Postgres
on a fresh Ubuntu VM (OCI free tier or otherwise) and getting from zero to a
running app with your real data.

## 1. Install Postgres on the VM

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-client
sudo systemctl enable --now postgresql
```

`postgresql-client` specifically provides `pg_dump`/`pg_restore` — required
for the app's own automatic daily backup (`server/backup.js`); without it,
backups silently fail (logged, doesn't crash the server) until it's installed.

## 2. Create the database and app user

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE smt_school WITH ENCODING 'UTF8' TEMPLATE template0;
CREATE USER smt_school WITH PASSWORD 'choose-a-real-password-here';
GRANT ALL PRIVILEGES ON DATABASE smt_school TO smt_school;
\c smt_school
GRANT ALL ON SCHEMA public TO smt_school;
SQL
```

**Encoding matters**: explicitly request UTF8. On some locales `template1`
defaults to something else, which will reject real data later (school
records legitimately contain non-ASCII characters — this was caught during
testing: an audit log entry containing "→" failed to insert against a
non-UTF8 test database).

If the app runs on the *same* VM as Postgres (the common case for a single
free-tier instance), you don't need to open Postgres's port (5432) to the
outside world at all — `DB_HOST=localhost` and Postgres's default
`pg_hba.conf` (local connections trusted/password-authenticated) is enough.
Only touch `pg_hba.conf`/`postgresql.conf`'s `listen_addresses` if the app
and database run on separate hosts.

## 3. Configure the app

Copy `.env.example` to `.env` and fill in:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=smt_school
DB_PASSWORD=<the password you set above>
DB_NAME=smt_school
DB_SSL=false
```

(`DB_SSL=false` is correct for local/same-host Postgres. Set to `true` only
if connecting to a remote/managed Postgres that requires TLS.)

## 4. Run migrations against the new database

Migrations run automatically on server startup (`db.migrate.latest()` in
`server/app.js`) — just starting the app once is enough:

```bash
node server/app.js
```

Watch for `Database migrated (pg)` in the output. Ctrl+C once you see it if
you're not ready to leave it running yet.

To run migrations without starting the full server (e.g. to check before
going further):

```bash
node -e "require('./server/db/database').migrate.latest().then(([b,l]) => { console.log('ran', l.length); process.exit(0); })"
```

## 5. Migrate your existing data (skip if starting fresh)

**Back up the SQLite file first** — this only reads it, but back it up
regardless:

```bash
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('school.db', sqlite3.OPEN_READONLY);
db.run(\"VACUUM INTO 'backups/school-pre-postgres-\$(date +%Y%m%dT%H%M%S).db'\", (err) => {
  if (err) throw err;
  console.log('Backup done');
});
"
```

Then, with migrations already applied (step 4) and the target Postgres
tables empty:

```bash
node server/db/migrate-to-postgres.js school.db
```

This copies every table over, preserving original ids, handling the
students↔admissions circular foreign key, coercing SQLite's 0/1 booleans to
real Postgres true/false, and resetting every table's id sequence so new
inserts continue after the highest migrated id. It prints a per-table row
count and a final source-vs-loaded verification — **don't proceed if it
reports a mismatch or exits non-zero.**

It is **not** an upsert/merge — it truncates each target table before
loading. Safe to re-run from scratch, but don't run it against a Postgres
database that already has real data you want to keep layered under it.

## 6. Verify

```bash
node server/app.js
curl http://localhost:<PORT>/api/health   # if such a route exists, else check the app loads in a browser
```

Log in, confirm real students/staff/admissions data shows up, and try
creating something (any "Add" button) to confirm writes work — the app
previously had a bug (found and fixed during this migration) where every
single "create" endpoint would fail against Postgres specifically due to a
knex `insert()` return-value difference between the two drivers; if you see
a `"... is not iterable"` or `"Server error"` on any create action, that's
this class of bug and something was missed — check `grep -rn "\] = await .*\.insert(" server/routes server/utils` for anything with no `.returning('id')` after it.

## 7. Ongoing backups

Once `postgresql-client` is installed (step 1), the existing daily backup
cron (`server/cron/backup.js`, 2 AM) automatically switches to `pg_dump -Fc`
snapshots in `backups/`, same as before — no further setup needed. Restore
with:

```bash
pg_restore -h localhost -U smt_school -d smt_school --clean --if-exists backups/school-<timestamp>.dump
```

## What changed, for reference

- `server/db/database.js` — SQLite → Postgres for everything except
  `NODE_ENV=test` (stays on in-memory SQLite for the test suite).
- All 22 migrations run correctly on both engines (5 of them needed real
  per-engine branches — SQLite's PRAGMA-based rebuild-and-swap technique vs
  Postgres's direct `ALTER TABLE ... DROP/ADD CONSTRAINT`).
- `server/backup.js` — `VACUUM INTO` (SQLite) → `pg_dump -Fc` (Postgres).
- Several `LIKE ... COLLATE NOCASE` raw queries (search boxes) →
  `.whereILike()`/`.orWhereILike()`, knex's portable case-insensitive LIKE.
- One `strftime()` raw query (admin resource-usage history chart) → an
  engine-aware bucket-format branch (`strftime()` vs `to_char()`).
- Every `const [id] = await db(table).insert({...})` pattern (this was the
  big one — 28 call sites across 15 files) → `const [{ id }] = await
  db(table).insert({...}).returning('id')`. SQLite's `.insert()` returns
  `[lastRowId]`; Postgres's returns `[]` unless you ask for `.returning()`,
  in which case both drivers return `[{ id: N }]` identically.
