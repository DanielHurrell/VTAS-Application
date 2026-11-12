
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const router = express.Router();

// Register a new applicant
router.post('/register', async (req, res) => {
    const { full_name, email, password, confirmPassword } = req.body;

    if (!full_name || !email || !password || !confirmPassword) {
        return res.status(400).send('Please complete all fields.');
    }

    if (password.length < 8) {
        return res.status(400).send('Password must be at least 8 characters long.');
    }

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (full_name, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(sql, [full_name, email, hashedPassword], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send('Email address is already registered.');
                }

                console.error(err);
                return res.status(500).send('Registration failed.');
            }

            res.redirect('/pages/login.html');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong.');
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Please enter your email and password.');
    }

    // Also get the admin level (Standard or Super) from the administrators table
    const sql = `
        SELECT u.*, COALESCE(ad.access_level, 'Standard') AS access_level
        FROM users u
        LEFT JOIN administrators ad ON ad.user_id = u.user_id
        WHERE u.email = ?
    `;

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Login failed.');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid email or password.');
        }

        const user = results[0];

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).send('Invalid email or password.');
            }

            // Deactivated accounts can't log in
            if (!user.is_active) {
                return res.status(403).send('This account has been deactivated. Please contact the system administrator.');
            }

            // Regenerate session after successful authentication
            req.session.regenerate((err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Could not create login session.');
                }

                req.session.user = {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    is_super_admin: user.role === 'admin' && user.access_level === 'Super'
                };

                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Could not save login session.');
                    }

                    if (user.role === 'admin') {
                        return res.redirect('/pages/admin.html');
                    }

                    return res.redirect('/pages/dashboard.html');
                });
            });

        } catch (error) {
            console.error(error);
            res.status(500).send('Login failed.');
        }
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Could not log out.');
        }

        res.clearCookie('connect.sid');
        res.redirect('/pages/login.html');
    });
});

module.exports = router;