const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_USERS = [
    { username: 'admin', password: 'admin', role: 'admin', email: 'admin@smtthane.edu' },
    { username: 'parent', password: 'parent', role: 'parent', email: 'parent@smtthane.edu' },
    { username: 'teacher', password: 'teacher', role: 'teacher', email: 'teacher@smtthane.edu' },
];

const ensureDefaultUsers = async () => {
    for (const entry of DEFAULT_USERS) {
        const existing = await User.findOne({ username: entry.username });
        if (existing) {
            if (existing.role !== entry.role) {
                existing.role = entry.role;
                await existing.save();
            }
            continue;
        }

        const passwordHash = await bcrypt.hash(entry.password, 12);
        const user = new User({
            username: entry.username,
            role: entry.role,
            password: passwordHash,
        });

        user.setEmail(entry.email);
        await user.save();
    }
};

module.exports = {
    ensureDefaultUsers,
};
