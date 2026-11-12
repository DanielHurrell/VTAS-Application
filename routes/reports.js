const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Only let logged-in admins see reports
// Must be a logged-in, ACTIVE admin (checked in the database)
const { requireAdminApi } = require('../middleware/auth');
const requireAdmin = requireAdminApi('Only administrators can view reports.');

// Each report has a title and the SQL that gets its data.
// The ? in some queries is replaced by the number of days.
const reports = {
    'visas-expiring': {
        title: 'Visas Expiring Soon',
        usesDays: true,
        sql: `
            SELECT u.full_name AS \`Applicant\`,
                   u.email AS \`Email\`,
                   v.visa_number AS \`Visa Number\`,
                   va.visa_type AS \`Visa Type\`,
                   va.destination_country AS \`Destination\`,
                   DATE_FORMAT(v.expiry_date, '%Y-%m-%d') AS \`Expiry Date\`,
                   DATEDIFF(v.expiry_date, CURDATE()) AS \`Days Left\`
            FROM visas v
            JOIN visa_applications va ON v.application_id = va.application_id
            JOIN applicants a ON va.applicant_id = a.applicant_id
            JOIN users u ON a.user_id = u.user_id
            WHERE v.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY v.expiry_date
        `
    },

    'visas-expired': {
        title: 'Expired Visas',
        usesDays: false,
        sql: `
            SELECT u.full_name AS \`Applicant\`,
                   u.email AS \`Email\`,
                   v.visa_number AS \`Visa Number\`,
                   va.visa_type AS \`Visa Type\`,
                   va.destination_country AS \`Destination\`,
                   DATE_FORMAT(v.expiry_date, '%Y-%m-%d') AS \`Expiry Date\`,
                   DATEDIFF(CURDATE(), v.expiry_date) AS \`Days Since Expiry\`
            FROM visas v
            JOIN visa_applications va ON v.application_id = va.application_id
            JOIN applicants a ON va.applicant_id = a.applicant_id
            JOIN users u ON a.user_id = u.user_id
            WHERE v.expiry_date < CURDATE()
            ORDER BY v.expiry_date DESC
        `
    },

    'passports-expiring': {
        title: 'Passports Expiring Soon',
        usesDays: true,
        sql: `
            SELECT u.full_name AS \`Applicant\`,
                   u.email AS \`Email\`,
                   p.passport_number AS \`Passport Number\`,
                   p.country_of_issue AS \`Country of Issue\`,
                   DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS \`Expiry Date\`,
                   DATEDIFF(p.expiry_date, CURDATE()) AS \`Days Left\`
            FROM passports p
            JOIN applicants a ON p.applicant_id = a.applicant_id
            JOIN users u ON a.user_id = u.user_id
            WHERE p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY p.expiry_date
        `
    },

    'applications-by-status': {
        title: 'Applications by Status',
        usesDays: false,
        sql: `
            SELECT current_status AS \`Status\`,
                   COUNT(*) AS \`Number of Applications\`
            FROM visa_applications
            GROUP BY current_status
            ORDER BY COUNT(*) DESC
        `
    },

    'applications-by-type': {
        title: 'Applications by Visa Type',
        usesDays: false,
        sql: `
            SELECT visa_type AS \`Visa Type\`,
                   COUNT(*) AS \`Number of Applications\`
            FROM visa_applications
            GROUP BY visa_type
            ORDER BY COUNT(*) DESC
        `
    },

    'all-applications': {
        title: 'All Applications',
        usesDays: false,
        sql: `
            SELECT va.application_id AS \`Application ID\`,
                   u.full_name AS \`Applicant\`,
                   va.visa_type AS \`Visa Type\`,
                   va.destination_country AS \`Destination\`,
                   DATE_FORMAT(va.application_date, '%Y-%m-%d') AS \`Date Submitted\`,
                   va.current_status AS \`Status\`
            FROM visa_applications va
            JOIN applicants a ON va.applicant_id = a.applicant_id
            JOIN users u ON a.user_id = u.user_id
            ORDER BY va.application_date DESC
        `
    }
};

// Example: GET /api/reports/visas-expiring?days=30
router.get('/:type', requireAdmin, (req, res) => {
    const report = reports[req.params.type];

    if (!report) {
        return res.status(404).json({ message: 'Report not found.' });
    }

    // Use 30 days if no number was given, and keep it between 1 and 365
    let days = parseInt(req.query.days) || 30;
    days = Math.min(Math.max(days, 1), 365);

    const params = report.usesDays ? [days] : [];

    db.query(report.sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Could not generate report.' });
        }

        res.json({
            title: report.title,
            days: report.usesDays ? days : null,
            rows: rows
        });
    });
});

module.exports = router;