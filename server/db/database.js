const path = require('path');
const knex = require('knex');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isTest = process.env.NODE_ENV === 'test';

const MIGRATIONS = { directory: path.join(__dirname, './migrations') };
const SEEDS = { directory: path.join(__dirname, './seeds') };

// Tests stay on in-memory SQLite — zero setup, fast, and doesn't require a
// live Postgres connection just to run the suite. Every migration in
// ./migrations is written to run correctly on BOTH engines (branches
// internally wherever SQLite and Postgres genuinely diverge), so this
// doesn't create two schemas to maintain, only two places the same
// migrations execute.
let config;
if (isTest) {
  config = {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: MIGRATIONS,
    seeds: SEEDS,
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn, done) => {
        conn.serialize(() => {
          conn.run('PRAGMA foreign_keys = ON');
          conn.run('PRAGMA journal_mode = WAL');
          conn.run('PRAGMA synchronous = NORMAL');
          conn.run('PRAGMA busy_timeout = 5000');
          done(null, conn);
        });
      },
    },
  };
} else {
  // Postgres, entirely env-driven — no hardcoded host/user/db anywhere.
  // See .env.example for the full list and server/db/README-postgres.md
  // (referenced from the migration report) for setup steps.
  const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required Postgres connection env var(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill these in.'
    );
  }

  config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // DB_SSL=true for managed Postgres that requires TLS; self-hosted
      // Postgres on the same private network (e.g. the OCI VM this app
      // itself runs on) typically doesn't need it — leave unset/false.
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    migrations: MIGRATIONS,
    seeds: SEEDS,
    pool: { min: 2, max: 10 },
  };
}

const db = knex(config);

module.exports = db;
