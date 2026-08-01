const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { encryptText } = require('./crypto');

const DEFAULT_USERS = [
    { username: 'admin', password: 'admin', role: 'admin', email: 'admin@smtthane.edu' },
    { username: 'parent', password: 'parent', role: 'parent', email: 'parent@smtthane.edu' },
    { username: 'teacher', password: 'teacher', role: 'teacher', email: 'teacher@smtthane.edu' },
    { username: 'principal', password: 'principal', role: 'principal', email: 'principal@smtthane.edu' },
];

const ensureDefaultUsers = async () => {
    for (const entry of DEFAULT_USERS) {
        const existing = await db('users').where({ username: entry.username }).first();
        if (existing) {
            if (existing.role !== entry.role) {
                await db('users').where({ id: existing.id }).update({ role: entry.role });
            }
            continue;
        }

        await db('users').insert({
            username: entry.username,
            role: entry.role,
            password: await bcrypt.hash(entry.password, 12),
            email_encrypted: encryptText(entry.email),
        });
    }
};

module.exports = {
    ensureDefaultUsers,
};
