
const express = require('express');
const db = require('../config/database');

const router = express.Router();
const database = db.promise();

// Get the logged-in applicant's profile
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [results] = await database.execute(`
            SELECT
                u.full_name,
                a.date_of_birth,
                a.nationality,
                a.phone,
                a.address,
                p.passport_number,
                p.country_of_issue,
                p.issue_date,
                p.expiry_date
            FROM users u
            LEFT JOIN applicants a ON a.applicant_id = (
                SELECT applicant_id
                FROM applicants
                WHERE user_id = u.user_id
                ORDER BY applicant_id DESC
                LIMIT 1
            )
            LEFT JOIN passports p ON p.passport_id = (
                SELECT passport_id
                FROM passports
                WHERE applicant_id = a.applicant_id
                ORDER BY passport_id DESC
                LIMIT 1
            )
            WHERE u.user_id = ?
        `, [userId]);

        res.json(results[0] || {});

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load profile.' });
    }
});

// Save or update the applicant's profile
router.post('/', async (req, res) => {
    const {
        full_name,
        date_of_birth,
        nationality,
        phone,
        address,
        passport_number,
        country_of_issue,
        issue_date,
        expiry_date
    } = req.body;

    if (!full_name || !passport_number || !country_of_issue ||
        !issue_date || !expiry_date) {
        return res.status(400).json({
            message: 'Please complete all required fields.'
        });
    }

    if (new Date(expiry_date) <= new Date(issue_date)) {
        return res.status(400).json({
            message: 'Passport expiry date must be after its issue date.'
        });
    }

    try {
        const userId = req.session.user.user_id;

        // Update the user's name
        await database.execute(
            'UPDATE users SET full_name = ? WHERE user_id = ?',
            [full_name, userId]
        );

        // Check whether an applicant profile already exists
        const [applicants] = await database.execute(
            'SELECT applicant_id FROM applicants WHERE user_id = ? ORDER BY applicant_id DESC LIMIT 1',
            [userId]
        );

        let applicantId;

        if (applicants.length > 0) {
            applicantId = applicants[0].applicant_id;

            await database.execute(`
                UPDATE applicants
                SET date_of_birth = ?, nationality = ?, phone = ?, address = ?
                WHERE applicant_id = ?
            `, [date_of_birth || null, nationality, phone, address, applicantId]);

        } else {
            const [result] = await database.execute(`
                INSERT INTO applicants
                (user_id, date_of_birth, nationality, phone, address)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, date_of_birth || null, nationality, phone, address]);

            applicantId = result.insertId;
        }

        // Check whether passport details already exist
        const [passports] = await database.execute(
            'SELECT passport_id FROM passports WHERE applicant_id = ? ORDER BY passport_id DESC LIMIT 1',
            [applicantId]
        );

        if (passports.length > 0) {
            await database.execute(`
                UPDATE passports
                SET passport_number = ?, country_of_issue = ?,
                    issue_date = ?, expiry_date = ?
                WHERE passport_id = ?
            `, [
                passport_number,
                country_of_issue,
                issue_date,
                expiry_date,
                passports[0].passport_id
            ]);

        } else {
            await database.execute(`
                INSERT INTO passports
                (applicant_id, passport_number, country_of_issue, issue_date, expiry_date)
                VALUES (?, ?, ?, ?, ?)
            `, [
                applicantId,
                passport_number,
                country_of_issue,
                issue_date,
                expiry_date
            ]);
        }

        // Update session name
        req.session.user.full_name = full_name;

        res.json({ message: 'Profile saved successfully!' });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'That passport number is already registered.'
            });
        }

        res.status(500).json({
            message: 'Could not save profile.'
        });
    }
});

module.exports = router;
