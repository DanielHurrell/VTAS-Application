const express = require('express');
const path = require('path');
const session = require('express-session');

require('./config/database');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const adminUserRoutes = require('./routes/admin-users');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'vtas-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60
    }
}));

app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/app.js', express.static(path.join(__dirname, 'public', 'app.js')));
app.use('/dashboard.js', express.static(path.join(__dirname, 'public', 'dashboard.js')));

app.get('/profile.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.js'));
});

// Authentication routes
app.use('/auth', authRoutes);

// Visa application API
app.use('/api/applications', requireAuth, applicationRoutes);

//Visa notifications API
app.use('/api/notifications', require('./routes/notifications'));

// Visa application page
app.get('/pages/applications.html', requireAuth, (req, res) => {
    if (req.session.user.role !== 'applicant') {
        return res.status(403).send('Access denied.');
    }

    res.sendFile(path.join(__dirname, 'public', 'pages', 'applications.html'));
});

// Application frontend JavaScript
app.get('/applications.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'applications.js'));
});

// Admin frontend JavaScript (dashboard and reports tabs)
app.get('/admin.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.js'));
});

// Profile API
app.use('/api/profile', requireAuth, profileRoutes);

// Reports API (admins only - checked inside routes/reports.js)
app.use('/api/reports', reportRoutes);

// Admin dashboard API (admins only - checked inside routes/admin.js)
app.use('/api/admin', adminRoutes);

// Managing admin accounts (super admin only - checked inside routes/admin-users.js)
app.use('/api/admin-users', adminUserRoutes);

// Return current login status
app.get('/auth/status', (req, res) => {
    if (req.session.user) {
        return res.json({
            loggedIn: true,
            user: req.session.user
        });
    }

    res.json({ loggedIn: false });
});

// Public pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pages/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
});

app.get('/pages/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'register.html'));
});

// Protected applicant dashboard
app.get('/pages/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

// Protected admin dashboard (includes the Reports tab)
app.get('/pages/admin.html', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'admin.html'));
});

app.get('/pages/profile.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'profile.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`VTAS server is running at http://localhost:${PORT}`);
});