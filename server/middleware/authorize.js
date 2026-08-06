const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Unauthorized request.' });
        }

        // Unfettered access by design — bypasses every allowedRoles check on
        // every route using this middleware, so granting it doesn't require
        // touching each route's allowlist individually.
        if (req.user.role === 'superuser') return next();

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
        }

        return next();
    };
};

module.exports = authorize;
