
const express = require('express');
const db = require('../config/database');
const upload = require('../middleware/upload');
const fs = require('fs');

const router = express.Router();
const database = db.promise();

// Delete uploaded files if the application submission fails
async function deleteUploadedFiles(files) {
    if (!files || files.length === 0) return;

    await Promise.all(
        files.map(file =>
            fs.promises.unlink(file.path).catch(error => {
                console.error('Could not delete uploaded file:', error);
            })
        )
    );
}

// Handle upload errors
function handleUpload(req, res, next) {
    upload.array('documents', 5)(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.message
            });
        }

        next();
    });
}

// Check that the logged-in user is an applicant
router.use((req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'applicant') {
        return res.status(403).json({
            message: 'Only applicants can access this feature.'
        });
    }

    next();
});

// Get applicant passport details and existing applications
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [passports] = await database.execute(`
            SELECT p.passport_number, p.country_of_issue,
                   p.expiry_date
            FROM applicants a
            JOIN passports p ON p.applicant_id = a.applicant_id
            WHERE a.user_id = ?
            ORDER BY p.passport_id DESC
            LIMIT 1
        `, [userId]);

        const [applications] = await database.execute(`
            SELECT application_id, visa_type,
                   destination_country, application_date,
                   current_status
            FROM visa_applications
            WHERE applicant_id IN (
                SELECT applicant_id
                FROM applicants
                WHERE user_id = ?
            )
            ORDER BY application_date DESC
        `, [userId]);

        res.json({
            passport: passports[0] || null,
            applications
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Could not retrieve applications.'
        });
    }
});

// Submit a new visa application with supporting documents
router.post('/', handleUpload, async (req, res) => {
    const files = req.files || [];
    const { visa_type } = req.body;
    const destination_country = 'South Africa';

    if (!visa_type) {
        await deleteUploadedFiles(files);

        return res.status(400).json({
            message: 'Please select a visa type.'
        });
    }

    const userId = req.session.user.user_id;

    try {
        // Find the applicant and their latest passport
        const [results] = await database.execute(`
            SELECT a.applicant_id, p.passport_id, p.expiry_date
            FROM applicants a
            JOIN passports p ON p.applicant_id = a.applicant_id
            WHERE a.user_id = ?
            ORDER BY p.passport_id DESC
            LIMIT 1
        `, [userId]);

        if (results.length === 0) {
            await deleteUploadedFiles(files);

            return res.status(400).json({
                message: 'Please complete your profile and passport details first.'
            });
        }

        const applicant = results[0];

        const expiryDate = new Date(applicant.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate < today) {
            await deleteUploadedFiles(files);

            return res.status(400).json({
                message: 'Your passport has expired. Please update your passport details.'
            });
        }

        // Create application, history and document records together
        await database.beginTransaction();

        try {
            // Create the visa application
            const [application] = await database.execute(`
                INSERT INTO visa_applications
                (applicant_id, passport_id, visa_type,
                 destination_country, current_status)
                VALUES (?, ?, ?, ?, 'Submitted')
            `, [
                applicant.applicant_id,
                applicant.passport_id,
                visa_type,
                destination_country
            ]);

            const applicationId = application.insertId;

            // Create initial status history
            await database.execute(`
                INSERT INTO status_history
                (application_id, previous_status, new_status,
                 changed_by, remarks)
                VALUES (?, NULL, 'Submitted', ?, 'Application submitted')
            `, [applicationId, userId]);

            // Save document information
            for (const file of files) {
                await database.execute(`
                    INSERT INTO application_documents
                    (application_id, original_filename, stored_filename,
                     file_path, mime_type, file_size)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    applicationId,
                    file.originalname,
                    file.filename,
                    `uploads/application-documents/${file.filename}`,
                    file.mimetype,
                    file.size
                ]);
            }

            // Commit all database changes
            await database.commit();

            res.status(201).json({
                message: 'Visa application submitted successfully!',
                application_id: applicationId,
                documents_uploaded: files.length
            });

        } catch (error) {
            await database.rollback();

            // Remove files if database operations fail
            await deleteUploadedFiles(files);

            throw error;
        }

    } catch (error) {
        console.error(error);

        // Clean up files if an earlier database operation failed
        await deleteUploadedFiles(files);

        res.status(500).json({
            message: 'Could not submit visa application.'
        });
    }
});

module.exports = router;
