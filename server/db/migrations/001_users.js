exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('username').notNullable().unique();
    t.string('email_encrypted').defaultTo('');
    t.string('password').notNullable();
    t.enu('role', ['admin', 'parent', 'teacher', 'principal']).defaultTo('parent');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
