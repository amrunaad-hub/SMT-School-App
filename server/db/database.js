const path = require('path');
const knex = require('knex');

const isTest = process.env.NODE_ENV === 'test';

// DB_PATH env var — relative to project root or absolute. Falls back to school.db.
const dbFile = isTest
  ? ':memory:'
  : process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, '../../', process.env.DB_PATH))
    : path.join(__dirname, '../../school.db');

const db = knex({
  client: 'sqlite3',
  connection: { filename: dbFile },
  migrations: {
    directory: path.join(__dirname, './migrations'),
  },
  seeds: {
    directory: path.join(__dirname, './seeds'),
  },
  pool: {
    min: 1,
    max: 1,
    afterCreate: (conn, done) => {
      conn.serialize(() => {
        conn.run('PRAGMA foreign_keys = ON');
        conn.run('PRAGMA journal_mode = WAL');   // survive crashes without corruption
        conn.run('PRAGMA synchronous = NORMAL'); // durable without full fsync penalty
        conn.run('PRAGMA busy_timeout = 5000');  // wait up to 5s on lock contention
        done(null, conn);
      });
    },
  },
  useNullAsDefault: true,
});

module.exports = db;
