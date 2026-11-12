const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { requireAdminApi } = require('../middleware/auth');

const router = express.Router();

// Every route in this file is for the super admin only
router.use(requireAdminApi('Only the super admin can manage admin accounts.', true));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Write one line to the audit log
function logAction(conn, userId, action, description, ip) {
    return conn.query(
        'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [userId, action, description, ip]
    );
}

// Find one admin account by ID (null if there isn't one)
async function findAdmin(id) {
    const [rows] = await db.promise().query(
        `SELECT u.user_id, u.full_name, u.email, u.is_active,
                COALESCE(ad.access_level, 'Standard') AS access_level
         FROM users u
         LEFT JOIN administrators ad ON ad.user_id = u.user_id
         WHERE u.user_id = ? AND u.role = 'admin'`,
        [id]
    );
    return rows[0] || null;
}

// Read the :id from the address (sends an error and returns null if it's not a number)
function readId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ message: 'Invalid admin ID.' });
        return null;
    }
    return id;
}

// Check a password and its confirmation (returns an error message, or null if fine)
function checkPassword(password, confirmPassword) {
    if (!password || !confirmPassword) return 'Please enter the password twice.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
}


// GET /api/admin-users?status=active|inactive  -> list of admins
router.get('/', async (req, res) => {
    const filter = req.query.status || '';
    let where = "WHERE u.role = 'admin'";

    if (filter === 'active') {
        where += ' AND u.is_active = 1';
    } else if (filter === 'inactive') {
        where += ' AND u.is_active = 0';
    } else if (filter !== '') {
        return res.status(400).json({ message: 'Unknown filter.' });
    }

    try {
        const [admins] = await db.promise().query(
            `SELECT u.user_id, u.full_name, u.email, u.is_active,
                    COALESCE(ad.access_level, 'Standard') AS access_level,
                    DATE_FORMAT(u.created_at, '%Y-%m-%d') AS created_at
             FROM users u
             LEFT JOIN administrators ad ON ad.user_id = u.user_id
             ${where}
             ORDER BY (ad.access_level = 'Super') DESC, u.full_name`
        );

        res.json({ admins, currentUserId: req.session.user.user_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load admin accounts.' });
    }
});


// GET /api/admin-users/:id  -> one admin and their recent activity
router.get('/:id', async (req, res) => {
    const id = readId(req, res);
    if (id === null) return;

    try {
        const admin = await findAdmin(id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const [activity] = await db.promise().query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at, action, description
             FROM audit_logs
             WHERE user_id = ?
             ORDER BY log_id DESC
             LIMIT 10`,
            [id]
        );

        res.json({ admin, activity });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load this admin account.' });
    }
});


// POST /api/admin-users  -> create a new (standard) admin
router.post('/', async (req, res) => {
    const fullName = (req.body.full_name || '').trim();
    const email = (req.body.email || '').trim();

    if (!fullName || !email) {
        return res.status(400).json({ message: 'Please complete all fields.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    const passwordProblem = checkPassword(req.body.password, req.body.confirmPassword);
    if (passwordProblem) {
        return res.status(400).json({ message: passwordProblem });
    }

    const conn = db.promise();

    try {
        const hash = await bcrypt.hash(req.body.password, 10);

        await conn.beginTransaction();

        const [result] = await conn.query(
            "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'admin')",
            [fullName, email, hash]
        );

        await conn.query(
            "INSERT INTO administrators (user_id, access_level) VALUES (?, 'Standard')",
            [result.insertId]
        );

        await logAction(conn, req.session.user.user_id, 'Create Admin',
            `Created admin account #${result.insertId} (${email})`, req.ip);

        await conn.commit();

        res.status(201).json({ message: `Admin account for ${fullName} was created.` });

    } catch (error) {
        await conn.rollback().catch(() => {});

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'That email address is already registered.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Could not create the admin account.' });
    }
});


// PUT /api/admin-users/:id  -> change name and email
router.put('/:id', async (req, res) => {
    const id = readId(req, res);
    if (id === null) return;

    const fullName = (req.body.full_name || '').trim();
    const email = (req.body.email || '').trim();

    if (!fullName || !email) {
        return res.status(400).json({ message: 'Please complete all fields.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        const admin = await findAdmin(id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        await db.promise().query(
            'UPDATE users SET full_name = ?, email = ? WHERE user_id = ?',
            [fullName, email, id]
        );

        await logAction(db.promise(), req.session.user.user_id, 'Update Admin',
            `Updated admin account #${id}`, req.ip);

        // Editing your own account: update your login session too
        if (id === req.session.user.user_id) {
            req.session.user.full_name = fullName;
            req.session.user.email = email;
        }

        res.json({ message: 'Changes saved.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'That email address is already registered.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Could not save the changes.' });
    }
});


// POST /api/admin-users/:id/password  -> reset the password
router.post('/:id/password', async (req, res) => {
    const id = readId(req, res);
    if (id === null) return;

    const passwordProblem = checkPassword(req.body.password, req.body.confirmPassword);
    if (passwordProblem) {
        return res.status(400).json({ message: passwordProblem });
    }

    try {
        const admin = await findAdmin(id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const hash = await bcrypt.hash(req.body.password, 10);
        await db.promise().query('UPDATE users SET password = ? WHERE user_id = ?', [hash, id]);

        await logAction(db.promise(), req.session.user.user_id, 'Reset Password',
            `Reset the password of admin account #${id}`, req.ip);

        res.json({ message: `The password for ${admin.full_name} was reset.` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not reset the password.' });
    }
});


// POST /api/admin-users/:id/status  { active: true/false }  -> reactivate or deactivate
router.post('/:id/status', async (req, res) => {
    const id = readId(req, res);
    if (id === null) return;

    const active = req.body.active;

    if (typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Please choose activate or deactivate.' });
    }
    if (id === req.session.user.user_id) {
        return res.status(400).json({ message: 'You cannot change the status of your own account.' });
    }

    try {
        const admin = await findAdmin(id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }
        if (admin.access_level === 'Super') {
            return res.status(400).json({ message: 'The super admin account cannot be deactivated.' });
        }
        if (Boolean(admin.is_active) === active) {
            return res.status(400).json({ message: `This account is already ${active ? 'active' : 'inactive'}.` });
        }

        await db.promise().query('UPDATE users SET is_active = ? WHERE user_id = ?', [active ? 1 : 0, id]);

        await logAction(db.promise(), req.session.user.user_id,
            active ? 'Reactivate Admin' : 'Deactivate Admin',
            `${active ? 'Reactivated' : 'Deactivated'} admin account #${id} (${admin.email})`, req.ip);

        res.json({ message: `${admin.full_name} has been ${active ? 'reactivated' : 'deactivated'}.` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not change the account status.' });
    }
});

module.exports = router;
