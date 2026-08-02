const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const db = require('./db/database');
const { startBackupCron } = require('./cron/backup');
const authRoutes = require('./routes/auth');
const attachmentRoutes = require('./routes/attachments');
const { ensureDefaultUsers } = require('./utils/seedUsers');
const studentRoutes = require('./routes/students');
const staffRoutes = require('./routes/staff');
const attendanceRoutes = require('./routes/attendance');
const timetableRoutes = require('./routes/timetable');
const feesRoutes = require('./routes/fees');
const examsRoutes = require('./routes/exams');
const admissionsRoutes = require('./routes/admissions');
const transportRoutes = require('./routes/transport');
const inventoryRoutes = require('./routes/inventory');
const noticesRoutes = require('./routes/notices');
const washroomsRoutes = require('./routes/washrooms');
const commandCenterRoutes = require('./routes/command-center');
const uploadsRoutes = require('./routes/uploads');
const publicRoutes = require('./routes/public');
const housesRoutes = require('./routes/houses');
const periodNotesRoutes = require('./routes/period-notes');
const notificationsRoutes = require('./routes/notifications');
const pushRoutes = require('./routes/push');
const { UPLOAD_ROOT } = require('./utils/upload');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin,
    credentials: false,
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'sha256-nfXs/PmEUs4hjGb0t/9ooCrNLsAQ9wVSXqfYybeGuqc='"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    const proto = req.get('x-forwarded-proto');
    if (proto && proto !== 'https') {
        return res.status(403).json({ message: 'HTTPS is required.' });
    }

    return next();
});

app.use(express.json());

// Database connection
let dbReady = false;

db.migrate.latest()
    .then(async () => {
        dbReady = true;
        console.log('SQLite migrated');
        await ensureDefaultUsers();
        console.log('Default role users ensured');
        startBackupCron();
    })
    .catch(err => {
        dbReady = false;
        console.error('Database migration error:', err.message);
    });

// Middleware to check DB readiness
app.use((req, res, next) => {
    const isApiRequest = req.path.startsWith('/api');
    const allowWithoutDb = new Set(['/api/health', '/api/auth/login']);

    if (isApiRequest && !allowWithoutDb.has(req.path) && !dbReady) {
        return res.status(503).json({ message: 'Service temporarily unavailable. Database migration failed.' });
    }

    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/washrooms', washroomsRoutes);
app.use('/api/command-center', commandCenterRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/houses', housesRoutes);
app.use('/api/period-notes', periodNotesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);

// Health check endpoint - must be before static files and wildcard
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbReady,
        commit: process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
    });
});

// Uploaded documents/photos (admission attachments, student photos, etc.)
app.use('/uploads', express.static(UPLOAD_ROOT));

// Serve static files
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath, { 
    setHeaders: (res, path) => {
        // Don't cache index.html
        if (path.endsWith('index.html')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// SPA fallback - MUST be last
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
            res.status(500).json({ message: 'Client build not found. Ensure "npm run build --prefix client" was executed during deployment.' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Client build path: ${clientBuildPath}`);
});