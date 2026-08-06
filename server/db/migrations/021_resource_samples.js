// Historical CPU/memory/disk usage — one row per minute, written by
// server/cron/resourceSampler.js. Plain numeric time-series, no JSON needed.
// No pruning/rollup yet: at 1 sample/minute this is ~525k rows/year, trivial
// for SQLite — only worth revisiting if this is still running years from now.
exports.up = async function (knex) {
  await knex.schema.createTable('resource_samples', (t) => {
    t.increments('id');
    t.timestamp('sampled_at').notNullable();
    t.float('cpu_percent');
    t.float('app_cpu_percent');
    t.bigInteger('mem_used_bytes');
    t.bigInteger('mem_total_bytes');
    t.bigInteger('app_mem_bytes');
    t.bigInteger('disk_used_bytes');
    t.bigInteger('disk_total_bytes');
    t.index('sampled_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('resource_samples');
};
