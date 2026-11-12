const db = require('../config/database');

// Looks up whether a user is still active, and their admin level
function loadAccount(userId, callback) {
    const sql = `
        SELECT u.role,
               u.is_active,
               COALESCE(ad.access_level, 'Standard') AS access_level
        FROM users u
        LEFT JOIN administrators ad ON ad.user_id = u.user_id
        WHERE u.user_id = ?
    `;

    db.query(sql, [userId], (err, rows) => callback(err, rows ? rows[0] : null));
}

// Check whether a user is logged in
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/pages/login.html');
    }

    next();
}

// For PAGES: must be a logged-in, active administrator
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/pages/login.html');
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Access denied. Administrators only.');
    }

    loadAccount(req.session.user.user_id, (err, account) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Could not check your account.');
        }

        // Deactivated since logging in: end the session
        if (!account || !account.is_active || account.role !== 'admin') {
            return req.session.destroy(() => res.redirect('/pages/login.html'));
        }

        req.session.user.is_super_admin = (account.access_level === 'Super');
        next();
    });
}

// For APIs: the same check, but answers with JSON.
// superOnly = true means only the super admin is allowed.
function requireAdminApi(message, superOnly = false) {
    return (req, res, next) => {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message });
        }

        loadAccount(req.session.user.user_id, (err, account) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Could not check your account.' });
            }

            // Deactivated since logging in: end the session
            if (!account || !account.is_active || account.role !== 'admin') {
                return req.session.destroy(() =>
                    res.status(401).json({ message: 'Your account has been deactivated.' }));
            }

            req.session.user.is_super_admin = (account.access_level === 'Super');

            if (superOnly && !req.session.user.is_super_admin) {
                return res.status(403).json({ message });
            }

            next();
        });
    };
}

module.exports = { requireAuth, requireAdmin, requireAdminApi };
