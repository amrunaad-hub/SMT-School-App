const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const attachmentRoutes = require('./routes/attachments');
const { ensureDefaultUsers } = require('./utils/seedUsers');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/school-erp');
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin,
    credentials: false,
}));
app.use(helmet());

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
let mongoConnected = false;

if (!MONGODB_URI) {
    console.error('MongoDB connection skipped: MONGODB_URI is missing.');
} else {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(async () => {
        mongoConnected = true;
        console.log('MongoDB connected');
        await ensureDefaultUsers();
        console.log('Default role users ensured');
    })
    .catch(err => {
        mongoConnected = false;
        console.error('MongoDB connection error:', err.message);
    });
}

// Middleware to check MongoDB connection
app.use((req, res, next) => {
    const isApiRequest = req.path.startsWith('/api');
    const isHealthRequest = req.path === '/api/health';

    if (isApiRequest && !isHealthRequest && !mongoConnected) {
        return res.status(503).json({ message: 'Service temporarily unavailable. Database connection failed. Check MongoDB configuration.' });
    }

    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attachments', attachmentRoutes);

// Health check endpoint - must be before static files and wildcard
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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