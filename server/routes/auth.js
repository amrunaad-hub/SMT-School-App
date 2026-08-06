const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { encryptText, decryptText } = require('../utils/crypto');
const { serializeRow } = require('../utils/serialize');
const { logAudit } = require('../utils/auditLog');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const router = express.Router();

const ROLES = ['admin', 'parent', 'teacher', 'principal', 'superuser'];

const FALLBACK_USERS = {
    admin: { password: 'admin', role: 'admin' },
    parent: { password: 'parent', role: 'parent' },
    teacher: { password: 'teacher', role: 'teacher' },
    principal: { password: 'principal', role: 'principal' },
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
            // Parents/teachers log in once and expect push notifications to
            // keep working indefinitely until they explicitly log out (see
            // the localStorage-over-sessionStorage decision in App.jsx) — an
            // 8h token directly undermined that: the app kept looking logged
            // in while every API call silently 401'd in the background,
            // which read as "no student linked" / random blank states hours
            // after a real login, not as a clear "please log in again."
            expiresIn: process.env.JWT_EXPIRES_IN || '90d',
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

        if (!ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        const existing = await db('users').where({ username }).first();
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const [id] = await db('users').insert({
            username,
            role,
            password: await bcrypt.hash(password, 12),
            email_encrypted: encryptText(email),
        });

        return res.status(201).json({
            message: 'User registered successfully.',
            user: { id, username, role },
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
        const user = await db('users').where({ username }).first();

        // Temporary fail-open for demo credentials when the DB has no users yet
        // (fresh install before seeding has run).
        if (!user) {
            const demoUser = FALLBACK_USERS[username];
            if (!demoUser || demoUser.password !== password) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = issueToken({ id: `demo-${username}`, username, role: demoUser.role });
            logAudit({ eventType: 'login', userId: null, username, role: demoUser.role, ip: req.ip, method: 'POST', path: '/api/auth/login', summary: 'Demo login' });

            return res.json({
                token,
                user: { id: `demo-${username}`, username, role: demoUser.role },
                warning: 'No users found. Signed in using temporary demo mode.',
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = issueToken(user);
        logAudit({ eventType: 'login', userId: user.id, username: user.username, role: user.role, ip: req.ip, method: 'POST', path: '/api/auth/login', summary: 'Login succeeded' });
        return res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/auth/logout — the client calls this (fire-and-forget) at the
// start of its logout flow, while the token is still valid, purely so the
// event lands in the audit trail. Nothing server-side actually needs
// invalidating — JWTs aren't tracked/blacklisted here.
router.post('/logout', auth, (req, res) => {
    logAudit({ eventType: 'logout', userId: typeof req.user.id === 'number' ? req.user.id : null, username: req.user.username, role: req.user.role, ip: req.ip, method: 'POST', path: '/api/auth/logout', summary: 'Logout' });
    return res.json({ message: 'Logged out.' });
});

// GET /api/me/children — resolves the logged-in parent to their linked
// student(s) via guardians.user_id -> student_guardians -> students. Any other
// role (or an unlinked demo login) just gets an empty list, not an error.
router.get('/me/children', auth, async (req, res) => {
    try {
        if (typeof req.user.id !== 'number') {
            return res.json({ children: [] });
        }

        const rows = await db('guardians')
            .join('student_guardians', 'student_guardians.guardian_id', 'guardians.id')
            .join('students', 'students.id', 'student_guardians.student_id')
            .leftJoin('houses', 'houses.id', 'students.house_id')
            .where('guardians.user_id', req.user.id)
            .select(
                'students.*',
                'student_guardians.relation as my_relation',
                'houses.name as house_name',
                'houses.color_hex as house_color'
            );

        const children = rows.map((r) => serializeRow(r, { boolFields: ['is_rte', 'is_maharashtrian'] }));
        return res.json({ children });
    } catch (err) {
        console.error('GET /api/me/children error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/auth/me/staff-profile — resolves the logged-in user to their staff
// record (staff.user_id -> users), plus which classes they teach and whether
// they're currently the official class teacher of any grade+division. The
// teacher-side equivalent of /me/children. Any role without a linked staff row
// (or a non-teacher role, or the unlinked demo `teacher` login) just gets null.
router.get('/me/staff-profile', auth, async (req, res) => {
    try {
        if (typeof req.user.id !== 'number') {
            return res.json({ staffProfile: null });
        }

        const staffMember = await db('staff').where({ user_id: req.user.id }).first();
        if (!staffMember) {
            return res.json({ staffProfile: null });
        }

        const [classAssignments, currentClassTeacherOf, house] = await Promise.all([
            db('staff_class_assignments').where({ staff_id: staffMember.id }),
            db('class_teacher_history').where({ staff_id: staffMember.id, unassigned_at: null }),
            staffMember.house_id ? db('houses').where({ id: staffMember.house_id }).first() : null,
        ]);

        return res.json({
            staffProfile: {
                ...serializeRow(staffMember, { jsonFields: ['assigned_subjects', 'compensation', 'roles'], boolFields: ['is_maharashtrian', 'is_brahmin'], jsonDefault: [] }),
                house: house ? serializeRow(house) : null,
                classAssignments: classAssignments.map((c) => serializeRow(c)),
                currentClassTeacherOf: currentClassTeacherOf.map((c) => serializeRow(c)),
            },
        });
    } catch (err) {
        console.error('GET /api/auth/me/staff-profile error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const user = await db('users').where({ id: req.user.id }).first();
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Resolve a human display name for the header/nav ("who's logged in
        // on this device") — falls back to the username for admin and any
        // account not yet linked to a staff/guardian row.
        let displayName = user.username;
        if (user.role === 'teacher' || user.role === 'principal') {
            const staff = await db('staff').where({ user_id: user.id }).first();
            if (staff) displayName = staff.display_name;
        } else if (user.role === 'parent') {
            const guardian = await db('guardians').where({ user_id: user.id }).first();
            if (guardian) displayName = guardian.full_name;
        }

        return res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: decryptText(user.email_encrypted),
                displayName,
            },
        });
    } catch (err) {
        console.error('Profile fetch error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
