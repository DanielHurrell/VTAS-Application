
const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Convert the existing MySQL connection into a promise-based connection
const database = db.promise();

// Get notifications for the logged-in applicant
router.get('/', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'applicant') {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const userId = req.session.user.user_id;

        const [notifications] = await database.query(
            `SELECT *
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        const unreadCount = notifications.filter(
            notification => !notification.is_read
        ).length;

        res.json({
            notifications,
            unreadCount
        });

    } catch (error) {
        console.error('Notification error:', error);

        res.status(500).json({
            message: 'Failed to retrieve notifications'
        });
    }
});


// Mark an individual notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'applicant') {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        await database.query(
            `UPDATE notifications
             SET is_read = 1
             WHERE notification_id = ?
             AND user_id = ?`,
            [req.params.id, req.session.user.user_id]
        );

        res.json({
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Notification update error:', error);

        res.status(500).json({
            message: 'Failed to update notification'
        });
    }
});


// Mark all notifications as read
router.patch('/read-all', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'applicant') {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        await database.query(
            `UPDATE notifications
             SET is_read = 1
             WHERE user_id = ?`,
            [req.session.user.user_id]
        );

        res.json({
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications error:', error);

        res.status(500).json({
            message: 'Failed to update notifications'
        });
    }
});

module.exports = router;
