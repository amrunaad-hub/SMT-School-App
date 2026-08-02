// Browser push subscriptions (Web Push API). One user can have several rows
// (one per device/browser they enabled notifications on).
exports.up = async function (knex) {
  await knex.schema.createTable('push_subscriptions', (t) => {
    t.increments('id');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('endpoint').notNullable().unique();
    t.string('p256dh').notNullable();
    t.string('auth').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('push_subscriptions', (t) => {
    t.index(['user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('push_subscriptions');
};
