const express = require('express');
const db = require('../config/database');

const router = express.Router();

// The statuses an admin is allowed to set
const ADMIN_STATUSES = ['Under Review', 'Additional Documents Required', 'Approved', 'Rejected'];

// Statuses that are final (can't be changed afterwards)
const FINAL_STATUSES = ['Approved', 'Rejected'];

// Only let logged-in admins use these routes
// Must be a logged-in, ACTIVE admin (checked in the database)
const { requireAdminApi } = require('../middleware/auth');
const requireAdmin = requireAdminApi('Only administrators can view this.');

// Checks that a date looks like YYYY-MM-DD
function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}


// ===================================================
// GET /api/admin/dashboard
// Numbers and recent applications for the Dashboard tab
// ===================================================
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        // 1. How many applications have each status
        const [statusRows] = await db.promise().query(
            `SELECT current_status, COUNT(*) AS total
             FROM visa_applications
             GROUP BY current_status`
        );

        // Turn the rows into an easy-to-use object, e.g. { Approved: 5, Rejected: 1 }
        const counts = {};
        statusRows.forEach(row => {
            counts[row.current_status] = row.total;
        });

        // 2. How many applicants are registered
        const [applicantRows] = await db.promise().query(
            'SELECT COUNT(*) AS total FROM applicants'
        );

        // 3. How many visas expire in the next 30 days
        const [expiringRows] = await db.promise().query(
            `SELECT COUNT(*) AS total
             FROM visas
             WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
        );

        // 4. The 10 newest applications, with the applicant's name
        const [recentApplications] = await db.promise().query(
            `SELECT va.application_id,
                    u.full_name,
                    va.visa_type,
                    va.destination_country,
                    DATE_FORMAT(va.application_date, '%Y-%m-%d') AS application_date,
                    va.current_status
             FROM visa_applications va
             JOIN applicants a ON va.applicant_id = a.applicant_id
             JOIN users u ON a.user_id = u.user_id
             ORDER BY va.application_date DESC
             LIMIT 10`
        );

        // "Pending" means any application that hasn't been decided yet
        const pending =
            (counts['Submitted'] || 0) +
            (counts['Under Review'] || 0) +
            (counts['Additional Documents Required'] || 0);

        const approved = counts['Approved'] || 0;
        const rejected = counts['Rejected'] || 0;

        res.json({
            totalApplications: pending + approved + rejected,
            pending: pending,
            approved: approved,
            rejected: rejected,
            totalApplicants: applicantRows[0].total,
            visasExpiringSoon: expiringRows[0].total,
            recentApplications: recentApplications
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load the dashboard.' });
    }
});


// ===================================================
// GET /api/admin/applications?status=Submitted
// List of applications for the Applications tab
// (leave status empty to get all of them)
// ===================================================
router.get('/applications', requireAdmin, async (req, res) => {
    const status = req.query.status || '';

    const allStatuses = ['Submitted', ...ADMIN_STATUSES];
    if (status !== '' && !allStatuses.includes(status)) {
        return res.status(400).json({ message: 'Unknown status.' });
    }

    try {
        const [applications] = await db.promise().query(
            `SELECT va.application_id,
                    u.full_name,
                    va.visa_type,
                    va.destination_country,
                    DATE_FORMAT(va.application_date, '%Y-%m-%d') AS application_date,
                    va.current_status
             FROM visa_applications va
             JOIN applicants a ON va.applicant_id = a.applicant_id
             JOIN users u ON a.user_id = u.user_id
             WHERE (? = '' OR va.current_status = ?)
             ORDER BY va.application_date DESC`,
            [status, status]
        );

        res.json({ applications: applications });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load applications.' });
    }
});


// ===================================================
// GET /api/admin/applications/5
// Everything about one application, for the Review panel
// ===================================================
router.get('/applications/:id', requireAdmin, async (req, res) => {
    const applicationId = parseInt(req.params.id);

    if (!applicationId) {
        return res.status(400).json({ message: 'Invalid application ID.' });
    }

    try {
        // 1. Application, applicant and passport details
        const [rows] = await db.promise().query(
            `SELECT va.application_id,
                    va.visa_type,
                    va.destination_country,
                    DATE_FORMAT(va.application_date, '%Y-%m-%d %H:%i') AS application_date,
                    va.current_status,
                    u.full_name,
                    u.email,
                    DATE_FORMAT(a.date_of_birth, '%Y-%m-%d') AS date_of_birth,
                    a.nationality,
                    a.phone,
                    a.address,
                    p.passport_number,
                    p.country_of_issue,
                    DATE_FORMAT(p.issue_date, '%Y-%m-%d') AS passport_issue_date,
                    DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS passport_expiry_date,
                    DATEDIFF(p.expiry_date, CURDATE()) AS passport_days_left
             FROM visa_applications va
             JOIN applicants a ON va.applicant_id = a.applicant_id
             JOIN users u ON a.user_id = u.user_id
             JOIN passports p ON va.passport_id = p.passport_id
             WHERE va.application_id = ?`,
            [applicationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        // 2. The visa, if one has been issued
        const [visaRows] = await db.promise().query(
            `SELECT visa_number,
                    DATE_FORMAT(issue_date, '%Y-%m-%d') AS issue_date,
                    DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                    conditions
             FROM visas
             WHERE application_id = ?`,
            [applicationId]
        );

        // 3. Every status change, newest first, with the admin's name
        const [history] = await db.promise().query(
            `SELECT sh.previous_status,
                    sh.new_status,
                    sh.remarks,
                    DATE_FORMAT(sh.changed_at, '%Y-%m-%d %H:%i') AS changed_at,
                    u.full_name AS changed_by
             FROM status_history sh
             JOIN users u ON sh.changed_by = u.user_id
             WHERE sh.application_id = ?
             ORDER BY sh.changed_at DESC, sh.history_id DESC`,
            [applicationId]
        );

        res.json({
            application: rows[0],
            visa: visaRows[0] || null,
            history: history,
            isFinal: FINAL_STATUSES.includes(rows[0].current_status)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load the application.' });
    }
});


// ===================================================
// POST /api/admin/applications/5/status
// Change an application's status (the admin's decision)
// ===================================================
router.post('/applications/:id/status', requireAdmin, async (req, res) => {
    const applicationId = parseInt(req.params.id);
    const admin = req.session.user;

    const newStatus = req.body.new_status;
    const remarks = (req.body.remarks || '').trim();
    const issueDate = req.body.issue_date;
    const expiryDate = req.body.expiry_date;
    const conditions = (req.body.conditions || '').trim();

    // ----- Check the input -----
    if (!applicationId) {
        return res.status(400).json({ message: 'Invalid application ID.' });
    }

    if (!ADMIN_STATUSES.includes(newStatus)) {
        return res.status(400).json({ message: 'Please choose a valid status.' });
    }

    if ((newStatus === 'Rejected' || newStatus === 'Additional Documents Required') && !remarks) {
        return res.status(400).json({ message: 'Please enter remarks explaining this decision.' });
    }

    if (newStatus === 'Approved') {
        if (!isValidDate(issueDate) || !isValidDate(expiryDate)) {
            return res.status(400).json({ message: 'Please enter the visa issue date and expiry date.' });
        }

        // Dates in YYYY-MM-DD format can be compared like text
        if (expiryDate <= issueDate) {
            return res.status(400).json({ message: 'The expiry date must be after the issue date.' });
        }
    }

    const conn = db.promise();

    try {
        // ----- Look up the application -----
        const [rows] = await conn.query(
            `SELECT va.current_status,
                    va.visa_type,
                    a.user_id,
                    DATEDIFF(p.expiry_date, CURDATE()) AS passport_days_left
             FROM visa_applications va
             JOIN applicants a ON va.applicant_id = a.applicant_id
             JOIN passports p ON va.passport_id = p.passport_id
             WHERE va.application_id = ?`,
            [applicationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        const application = rows[0];

        if (FINAL_STATUSES.includes(application.current_status)) {
            return res.status(400).json({
                message: 'This application has already been decided and cannot be changed.'
            });
        }

        if (application.current_status === newStatus) {
            return res.status(400).json({ message: 'The application already has this status.' });
        }

        if (newStatus === 'Approved' && application.passport_days_left < 0) {
            return res.status(400).json({
                message: "The applicant's passport has expired, so this application cannot be approved."
            });
        }

        // ----- Save everything together -----
        // A transaction means: either ALL of these changes are saved, or NONE are.
        await conn.beginTransaction();

        // 1. Update the application's status
        await conn.query(
            'UPDATE visa_applications SET current_status = ? WHERE application_id = ?',
            [newStatus, applicationId]
        );

        // 2. Record the change in the history
        await conn.query(
            `INSERT INTO status_history (application_id, previous_status, new_status, changed_by, remarks)
             VALUES (?, ?, ?, ?, ?)`,
            [applicationId, application.current_status, newStatus, admin.user_id, remarks || null]
        );

        // 3. If approved, create the visa
        let visaNumber = null;

        if (newStatus === 'Approved') {
            // Example visa number: ZA-V-2026-000123
            visaNumber = `ZA-V-${new Date().getFullYear()}-${String(applicationId).padStart(6, '0')}`;

            await conn.query(
                `INSERT INTO visas (application_id, visa_number, issue_date, expiry_date, validity_status, conditions)
                 VALUES (?, ?, ?, ?, IF(DATEDIFF(?, CURDATE()) <= 30, 'Expiring Soon', 'Active'), ?)`,
                [applicationId, visaNumber, issueDate, expiryDate, expiryDate, conditions || null]
            );
        }

        // 4. Write the message the applicant will see
        const appName = `${application.visa_type} application (#${applicationId})`;
        let message = '';

        if (newStatus === 'Under Review') {
            message = `Your ${appName} is now under review.`;
        } else if (newStatus === 'Additional Documents Required') {
            message = `Your ${appName} needs additional documents: ${remarks}`;
        } else if (newStatus === 'Approved') {
            message = `Your ${appName} has been approved. Visa number: ${visaNumber}, valid until ${expiryDate}.`;
        } else if (newStatus === 'Rejected') {
            message = `Your ${appName} has been rejected. Reason: ${remarks}`;
        }

        await conn.query(
            `INSERT INTO notifications (user_id, application_id, message, notification_type, sent_at, delivery_status)
             VALUES (?, ?, ?, 'Status Update', NOW(), 'Sent')`,
            [application.user_id, applicationId, message]
        );

        // 5. Record what the admin did in the audit log
        await conn.query(
            `INSERT INTO audit_logs (user_id, action, description, ip_address)
             VALUES (?, 'Status Change', ?, ?)`,
            [
                admin.user_id,
                `Application #${applicationId}: ${application.current_status} -> ${newStatus}`,
                req.ip
            ]
        );

        await conn.commit();

        res.json({ message: `Application #${applicationId} is now "${newStatus}".` });

    } catch (error) {
        // Something went wrong, so undo any changes from this request
        try {
            await conn.rollback();
        } catch (rollbackError) {
            console.error(rollbackError);
        }

        console.error(error);
        res.status(500).json({ message: 'Could not update the application.' });
    }
});

module.exports = router;