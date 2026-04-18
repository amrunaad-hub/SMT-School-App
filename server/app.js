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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-erp';
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
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('MongoDB connected');
    await ensureDefaultUsers();
    console.log('Default role users ensured');
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attachments', attachmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files and SPA
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// Fallback to index.html for SPA routing
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