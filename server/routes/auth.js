const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const router = express.Router();

const FALLBACK_USERS = {
    admin: { password: 'admin', role: 'admin' },
    parent: { password: 'parent', role: 'parent' },
    teacher: { password: 'teacher', role: 'teacher' },
};

const issueToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT secret is missing');
    }

    return jwt.sign(
        {
            sub: user.id,
            role: user.role,
            username: user.username,
        },
        secret,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
            issuer: process.env.JWT_ISSUER || 'smt-school-erp',
            audience: process.env.JWT_AUDIENCE || 'smt-school-clients',
        }
    );
};

// Register route
router.post('/register', auth, authorize(['admin']), async (req, res) => {
    const { username, password, role = 'parent', email = '' } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        if (!['admin', 'parent', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            role,
            password: await bcrypt.hash(password, 12)
        });
        user.setEmail(email);

        await user.save();

        return res.status(201).json({
            message: 'User registered successfully.',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Register error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const isDbConnected = User.db && User.db.readyState === 1;

        // Temporary fail-open for demo credentials when DB is unavailable.
        if (!isDbConnected) {
            const demoUser = FALLBACK_USERS[username];
            if (!demoUser || demoUser.password !== password) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = issueToken({
                id: `demo-${username}`,
                username,
                role: demoUser.role,
            });

            return res.json({
                token,
                user: {
                    id: `demo-${username}`,
                    username,
                    role: demoUser.role,
                },
                warning: 'Database unavailable. Signed in using temporary demo mode.',
            });
        }

        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = issueToken(user);
        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.getEmail(),
            },
        });
    } catch (err) {
        console.error('Profile fetch error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;