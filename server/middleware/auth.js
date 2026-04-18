const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const authHeader = req.header('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    const queryToken = (req.query && req.query.access_token) ? String(req.query.access_token).trim() : '';
    const token = bearerToken || queryToken;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Server security is not configured.' });
        }

        const decoded = jwt.verify(token, secret, {
            issuer: process.env.JWT_ISSUER || 'smt-school-erp',
            audience: process.env.JWT_AUDIENCE || 'smt-school-clients',
        });

        req.user = {
            id: decoded.sub,
            role: decoded.role,
            username: decoded.username,
        };

        return next();
    } catch (ex) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = auth;