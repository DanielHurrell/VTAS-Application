// ----- Switching tabs -----

const TAB_NAMES = ['dashboard', 'applications', 'reports', 'admins'];

// Show one tab and hide the others
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.hidden = (tab.id !== tabName);
    });

    // Highlight the active link in the menu
    // (looked up each time, because app.js rebuilds the menu)
    document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tabName);
    });

    // Load each tab's data the first time it's opened
    if (tabName === 'applications' && !applicationsLoaded) {
        loadApplications();
    }

    if (tabName === 'reports' && !currentReport) {
        generateReport();
    }

    if (tabName === 'admins' && !adminsLoaded) {
        loadAdmins();
    }
}

// Work out which tab to show from the address (#dashboard, #applications or #reports)
function showTabFromAddress() {
    const fromAddress = window.location.hash.replace('#', '');
    const tabName = TAB_NAMES.includes(fromAddress) ? fromAddress : 'dashboard';
    showTab(tabName);
}

// When the end of the address changes (a tab link was clicked), switch tabs
window.addEventListener('hashchange', showTabFromAddress);


// ----- Helper functions -----

// Add a row to a table. "values" is a list of cell texts.
function addRow(tableBody, values) {
    const row = document.createElement('tr');

    values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '';
        row.appendChild(cell);
    });

    tableBody.appendChild(row);
    return row;
}

// Add a "Label: value" line inside a box
function addDetail(box, label, value) {
    const line = document.createElement('p');
    const strong = document.createElement('strong');

    strong.textContent = label + ': ';
    line.appendChild(strong);
    line.appendChild(document.createTextNode(value || '-'));

    box.appendChild(line);
}

// Today's date as YYYY-MM-DD (in the computer's own time zone)
function todayAsText() {
    return new Date().toLocaleDateString('en-CA');
}


// ----- Dashboard tab -----

async function loadDashboard() {
    const dashboardMessage = document.getElementById('dashboardMessage');
    const recentTable = document.getElementById('recentApplications');

    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Fill in the summary boxes
        document.getElementById('totalApplications').textContent = data.totalApplications;
        document.getElementById('pendingCount').textContent = data.pending;
        document.getElementById('approvedCount').textContent = data.approved;
        document.getElementById('rejectedCount').textContent = data.rejected;
        document.getElementById('applicantCount').textContent = data.totalApplicants;
        document.getElementById('expiringCount').textContent = data.visasExpiringSoon;

        // Fill in the recent applications table
        recentTable.innerHTML = '';

        if (data.recentApplications.length === 0) {
            recentTable.innerHTML =
                '<tr><td colspan="6">No applications have been submitted yet.</td></tr>';
            return;
        }

        data.recentApplications.forEach(application => {
            addRow(recentTable, [
                application.application_id,
                application.full_name,
                application.visa_type,
                application.destination_country,
                application.application_date,
                application.current_status
            ]);
        });

    } catch (error) {
        console.error(error);
        dashboardMessage.textContent = error.message || 'Could not load the dashboard.';
        recentTable.innerHTML = '<tr><td colspan="6">Could not load applications.</td></tr>';
    }
}


// ----- Applications tab -----

const statusFilter = document.getElementById('statusFilter');
const applicationTable = document.getElementById('applicationTable');
const reviewPanel = document.getElementById('reviewPanel');
const decisionForm = document.getElementById('decisionForm');
const newStatusSelect = document.getElementById('newStatus');
const approvalFields = document.getElementById('approvalFields');
const decisionMessage = document.getElementById('decisionMessage');
const finalMessage = document.getElementById('finalMessage');
const saveDecisionButton = document.getElementById('saveDecisionButton');

let applicationsLoaded = false;     // has the list been loaded yet?
let currentApplicationId = null;    // which application is open in the review panel

// The list of applications
async function loadApplications() {
    applicationsLoaded = true;
    applicationTable.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    try {
        const url = `/api/admin/applications?status=${encodeURIComponent(statusFilter.value)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        applicationTable.innerHTML = '';

        if (data.applications.length === 0) {
            applicationTable.innerHTML =
                '<tr><td colspan="7">No applications found.</td></tr>';
            return;
        }

        data.applications.forEach(application => {
            const row = addRow(applicationTable, [
                application.application_id,
                application.full_name,
                application.visa_type,
                application.destination_country,
                application.application_date,
                application.current_status
            ]);

            // Add a "Review" button in the last column
            const cell = document.createElement('td');
            const button = document.createElement('button');
            button.textContent = 'Review';
            button.className = 'small-button';
            button.addEventListener('click', () => openReview(application.application_id));
            cell.appendChild(button);
            row.appendChild(cell);
        });

    } catch (error) {
        console.error(error);
        applicationTable.innerHTML =
            '<tr><td colspan="7">Could not load applications.</td></tr>';
    }
}

// The review panel for one application
async function openReview(applicationId) {
    currentApplicationId = applicationId;
    reviewPanel.hidden = false;
    decisionMessage.textContent = '';
    decisionMessage.className = '';

    // Clear the boxes while loading
    const applicationBox = document.getElementById('applicationDetails');
    const applicantBox = document.getElementById('applicantDetails');
    const passportBox = document.getElementById('passportDetails');
    const visaBox = document.getElementById('visaDetails');
    const historyList = document.getElementById('historyList');

    [applicationBox, applicantBox, passportBox, visaBox, historyList].forEach(box => {
        box.innerHTML = '';
    });

    document.getElementById('reviewTitle').textContent = `Application #${applicationId}`;
    reviewPanel.scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch(`/api/admin/applications/${applicationId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        const a = data.application;

        // Application
        addDetail(applicationBox, 'Visa Type', a.visa_type);
        addDetail(applicationBox, 'Destination', a.destination_country);
        addDetail(applicationBox, 'Submitted', a.application_date);
        addDetail(applicationBox, 'Current Status', a.current_status);

        // Applicant
        addDetail(applicantBox, 'Name', a.full_name);
        addDetail(applicantBox, 'Email', a.email);
        addDetail(applicantBox, 'Date of Birth', a.date_of_birth);
        addDetail(applicantBox, 'Nationality', a.nationality);
        addDetail(applicantBox, 'Phone', a.phone);
        addDetail(applicantBox, 'Address', a.address);

        // Passport
        addDetail(passportBox, 'Number', a.passport_number);
        addDetail(passportBox, 'Country of Issue', a.country_of_issue);
        addDetail(passportBox, 'Issue Date', a.passport_issue_date);
        addDetail(passportBox, 'Expiry Date', a.passport_expiry_date);

        if (a.passport_days_left < 0) {
            const warning = document.createElement('p');
            warning.className = 'error-text';
            warning.textContent = 'This passport has expired. The application cannot be approved.';
            passportBox.appendChild(warning);
        }

        // Visa
        if (data.visa) {
            addDetail(visaBox, 'Visa Number', data.visa.visa_number);
            addDetail(visaBox, 'Issue Date', data.visa.issue_date);
            addDetail(visaBox, 'Expiry Date', data.visa.expiry_date);
            addDetail(visaBox, 'Conditions', data.visa.conditions);
        } else {
            addDetail(visaBox, 'Visa', 'Not issued');
        }

        // History
        if (data.history.length === 0) {
            historyList.innerHTML = '<tr><td colspan="5">No changes yet.</td></tr>';
        } else {
            data.history.forEach(h => {
                addRow(historyList, [h.changed_at, h.previous_status, h.new_status, h.changed_by, h.remarks]);
            });
        }

        // Show the decision form only if the application isn't decided yet
        decisionForm.hidden = data.isFinal;
        finalMessage.hidden = !data.isFinal;

        // Reset the form for this application
        decisionForm.reset();
        approvalFields.hidden = true;
        document.getElementById('issueDate').value = todayAsText();

    } catch (error) {
        console.error(error);
        decisionMessage.className = 'error-text';
        decisionMessage.textContent = error.message || 'Could not load the application.';
    }
}

// Show the date fields only when "Approve" is chosen
newStatusSelect.addEventListener('change', () => {
    approvalFields.hidden = (newStatusSelect.value !== 'Approved');
});

// Saving a decision
decisionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = Object.fromEntries(new FormData(decisionForm));
    const status = formData.new_status;
    const remarks = (formData.remarks || '').trim();

    decisionMessage.className = 'error-text';

    // Check the form before sending it
    if (!status) {
        decisionMessage.textContent = 'Please choose a new status.';
        return;
    }

    if ((status === 'Rejected' || status === 'Additional Documents Required') && !remarks) {
        decisionMessage.textContent = 'Please enter remarks explaining this decision.';
        return;
    }

    if (status === 'Approved') {
        if (!formData.issue_date || !formData.expiry_date) {
            decisionMessage.textContent = 'Please enter the visa issue date and expiry date.';
            return;
        }

        if (formData.expiry_date <= formData.issue_date) {
            decisionMessage.textContent = 'The expiry date must be after the issue date.';
            return;
        }
    }

    // Ask before final decisions, because they can't be undone
    if (status === 'Approved' || status === 'Rejected') {
        const action = status === 'Approved' ? 'approve' : 'reject';
        if (!confirm(`Are you sure you want to ${action} this application? This cannot be undone.`)) {
            return;
        }
    }

    saveDecisionButton.disabled = true;
    decisionMessage.className = '';
    decisionMessage.textContent = 'Saving...';

    try {
        const response = await fetch(`/api/admin/applications/${currentApplicationId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        // Reload everything so the new status shows everywhere
        await openReview(currentApplicationId);
        decisionMessage.className = 'success-text';
        decisionMessage.textContent = result.message;

        loadApplications();
        loadDashboard();
        currentReport = null; // reports will reload next time they're opened

    } catch (error) {
        console.error(error);
        decisionMessage.className = 'error-text';
        decisionMessage.textContent = error.message || 'Could not save the decision.';
    } finally {
        saveDecisionButton.disabled = false;
    }
});

// Close the review panel
document.getElementById('closeReviewButton').addEventListener('click', () => {
    reviewPanel.hidden = true;
    currentApplicationId = null;
});

// Reload the list when the filter changes
statusFilter.addEventListener('change', loadApplications);


// ----- Reports tab -----

const reportType = document.getElementById('reportType');
const daysBox = document.getElementById('daysBox');
const daysInput = document.getElementById('days');
const reportTitle = document.getElementById('reportTitle');
const reportInfo = document.getElementById('reportInfo');
const reportHead = document.getElementById('reportHead');
const reportBody = document.getElementById('reportBody');

// Remember the last report so we can download it as CSV
let currentReport = null;

// Only show the "days" box for reports that use it
function updateDaysBox() {
    const usesDays = reportType.value === 'visas-expiring' ||
                     reportType.value === 'passports-expiring';
    daysBox.style.display = usesDays ? 'inline' : 'none';
}

// Get the report from the server and show it in the table
async function generateReport() {
    reportTitle.textContent = 'Loading...';
    reportInfo.textContent = '';
    reportHead.innerHTML = '';
    reportBody.innerHTML = '';

    try {
        const url = `/api/reports/${reportType.value}?days=${daysInput.value}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        currentReport = data;

        // Title and summary line
        reportTitle.textContent = data.title;
        let info = `Generated on ${new Date().toLocaleString()} | ${data.rows.length} record(s)`;
        if (data.days) {
            info += ` | Within the next ${data.days} days`;
        }
        reportInfo.textContent = info;

        // No results
        if (data.rows.length === 0) {
            reportBody.innerHTML = '<tr><td>No records found for this report.</td></tr>';
            return;
        }

        // Table headings come from the column names
        const columns = Object.keys(data.rows[0]);
        const headRow = document.createElement('tr');
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headRow.appendChild(th);
        });
        reportHead.appendChild(headRow);

        // One table row per record
        data.rows.forEach(record => {
            addRow(reportBody, columns.map(column => record[column]));
        });

    } catch (error) {
        console.error(error);
        reportTitle.textContent = '';
        reportInfo.textContent = error.message || 'Could not load the report.';
        currentReport = null;
    }
}

// Turn the current report into a CSV file and download it
function downloadCSV() {
    if (!currentReport || currentReport.rows.length === 0) {
        alert('Generate a report with results first.');
        return;
    }

    const columns = Object.keys(currentReport.rows[0]);

    // Put quotes around each value so commas inside values don't break the file
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const lines = [columns.map(quote).join(',')];
    currentReport.rows.forEach(record => {
        lines.push(columns.map(column => quote(record[column])).join(','));
    });

    const file = new Blob([lines.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `${reportType.value}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Connect the buttons
document.getElementById('generateButton').addEventListener('click', generateReport);
document.getElementById('printButton').addEventListener('click', () => window.print());
document.getElementById('csvButton').addEventListener('click', downloadCSV);
reportType.addEventListener('change', updateDaysBox);


// ----- Admins tab (super admin only) -----

const adminsMessage = document.getElementById('adminsMessage');
const adminsContent = document.getElementById('adminsContent');
const adminTable = document.getElementById('adminTable');
const adminFilter = document.getElementById('adminFilter');
const createAdminForm = document.getElementById('createAdminForm');
const editAdminPanel = document.getElementById('editAdminPanel');
const editAdminMessage = document.getElementById('editAdminMessage');
const toggleAdminButton = document.getElementById('toggleAdminButton');

let adminsLoaded = false;   // has the list been loaded yet?
let currentAdmin = null;    // the admin open in the edit panel
let myUserId = null;        // the logged-in super admin's ID

// Show a message in green (success) or red (error)
function showMessage(element, text, isError) {
    element.textContent = text;
    element.className = isError ? 'error-text' : 'success-text';
}

// Send JSON to the server; returns the reply, or throws its error message
async function sendJSON(url, method, body) {
    const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }
    return data;
}

// Add a table cell holding a coloured badge
function addBadgeCell(row, text, className) {
    const cell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge ' + className;
    badge.textContent = text;
    cell.appendChild(badge);
    row.appendChild(cell);
}

// The list of admins
async function loadAdmins() {
    adminsLoaded = true;
    adminTable.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        const response = await fetch(`/api/admin-users?status=${encodeURIComponent(adminFilter.value)}`);
        const data = await response.json();

        if (response.status === 403) {
            adminsContent.hidden = true;   // not the super admin
        }
        if (!response.ok) {
            throw new Error(data.message);
        }

        myUserId = data.currentUserId;
        adminTable.innerHTML = '';

        if (data.admins.length === 0) {
            adminTable.innerHTML = '<tr><td colspan="6">No admin accounts found.</td></tr>';
            return;
        }

        data.admins.forEach(admin => {
            const isMe = admin.user_id === myUserId;
            const isSuper = admin.access_level === 'Super';
            const isActive = Number(admin.is_active) === 1;

            const row = addRow(adminTable, [
                isMe ? `${admin.full_name} (you)` : admin.full_name,
                admin.email
            ]);
            addBadgeCell(row, isSuper ? 'Super Admin' : 'Admin', isSuper ? 'badge-super' : 'badge-role');
            addBadgeCell(row, isActive ? 'Active' : 'Inactive', isActive ? 'badge-active' : 'badge-inactive');

            const dateCell = document.createElement('td');
            dateCell.textContent = admin.created_at;
            row.appendChild(dateCell);

            // Buttons
            const actions = document.createElement('td');

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'small-button';
            editButton.addEventListener('click', () => openAdmin(admin.user_id));
            actions.appendChild(editButton);

            // No Deactivate button for yourself or the super admin
            if (!isMe && !isSuper) {
                const toggle = document.createElement('button');
                toggle.textContent = isActive ? 'Deactivate' : 'Reactivate';
                toggle.className = isActive ? 'small-button danger-button' : 'small-button reactivate-button';
                toggle.addEventListener('click', () => changeAdminStatus(admin, !isActive));
                actions.appendChild(toggle);
            }

            row.appendChild(actions);
        });

    } catch (error) {
        console.error(error);
        adminTable.innerHTML = '';
        showMessage(adminsMessage, error.message || 'Could not load admin accounts.', true);
    }
}

// Deactivate or reactivate
async function changeAdminStatus(admin, active) {
    const question = active
        ? `Reactivate ${admin.full_name}? They will be able to log in again.`
        : `Deactivate ${admin.full_name}? They will be signed out and can no longer log in. Their history is kept.`;

    if (!confirm(question)) {
        return;
    }

    try {
        const data = await sendJSON(`/api/admin-users/${admin.user_id}/status`, 'POST', { active: active });
        showMessage(adminsMessage, data.message, false);
        await loadAdmins();

        if (currentAdmin && currentAdmin.user_id === admin.user_id) {
            await openAdmin(admin.user_id);
        }
    } catch (error) {
        showMessage(adminsMessage, error.message || 'Could not change the account status.', true);
    }
}

// The edit panel for one admin
async function openAdmin(userId) {
    editAdminMessage.textContent = '';
    editAdminMessage.className = '';

    try {
        const response = await fetch(`/api/admin-users/${userId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        currentAdmin = data.admin;
        const isMe = currentAdmin.user_id === myUserId;
        const isSuper = currentAdmin.access_level === 'Super';
        const isActive = Number(currentAdmin.is_active) === 1;

        document.getElementById('editAdminTitle').textContent = `Edit Admin: ${currentAdmin.full_name}`;
        document.getElementById('editAdminName').value = currentAdmin.full_name;
        document.getElementById('editAdminEmail').value = currentAdmin.email;
        document.getElementById('resetPasswordForm').reset();

        const statusText = document.getElementById('editAdminStatusText');

        if (isMe || isSuper) {
            statusText.textContent = 'Status: Active. The super admin account cannot be deactivated.';
            toggleAdminButton.hidden = true;
        } else {
            statusText.textContent = isActive
                ? 'Status: Active. Deactivating stops this admin from logging in. Their past decisions and audit log entries are kept.'
                : 'Status: Inactive. This admin cannot log in.';
            toggleAdminButton.hidden = false;
            toggleAdminButton.textContent = isActive ? 'Deactivate' : 'Reactivate';
            toggleAdminButton.className = isActive ? 'danger-button' : 'secondary-button';
        }

        // Recent activity from the audit log
        const activityList = document.getElementById('adminActivityList');
        activityList.innerHTML = '';

        if (data.activity.length === 0) {
            activityList.innerHTML = '<tr><td colspan="3">No activity yet.</td></tr>';
        }
        data.activity.forEach(item => {
            addRow(activityList, [item.created_at, item.action, item.description]);
        });

        editAdminPanel.hidden = false;
        editAdminPanel.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        showMessage(adminsMessage, error.message || 'Could not open this admin account.', true);
    }
}

// Forms and buttons
createAdminForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = {
        full_name: document.getElementById('newAdminName').value.trim(),
        email: document.getElementById('newAdminEmail').value.trim(),
        password: document.getElementById('newAdminPassword').value,
        confirmPassword: document.getElementById('newAdminConfirm').value
    };

    if (body.password !== body.confirmPassword) {
        showMessage(adminsMessage, 'Passwords do not match.', true);
        return;
    }

    try {
        const data = await sendJSON('/api/admin-users', 'POST', body);
        showMessage(adminsMessage, data.message, false);
        createAdminForm.reset();
        loadAdmins();
    } catch (error) {
        showMessage(adminsMessage, error.message || 'Could not create the admin account.', true);
    }
});

document.getElementById('editAdminForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const data = await sendJSON(`/api/admin-users/${currentAdmin.user_id}`, 'PUT', {
            full_name: document.getElementById('editAdminName').value.trim(),
            email: document.getElementById('editAdminEmail').value.trim()
        });
        showMessage(editAdminMessage, data.message, false);
        loadAdmins();
    } catch (error) {
        showMessage(editAdminMessage, error.message || 'Could not save the changes.', true);
    }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('resetAdminPassword').value;
    const confirmPassword = document.getElementById('resetAdminConfirm').value;

    if (password !== confirmPassword) {
        showMessage(editAdminMessage, 'Passwords do not match.', true);
        return;
    }

    try {
        const data = await sendJSON(`/api/admin-users/${currentAdmin.user_id}/password`, 'POST',
            { password: password, confirmPassword: confirmPassword });
        showMessage(editAdminMessage, data.message, false);
        document.getElementById('resetPasswordForm').reset();
    } catch (error) {
        showMessage(editAdminMessage, error.message || 'Could not reset the password.', true);
    }
});

toggleAdminButton.addEventListener('click', () => {
    changeAdminStatus(currentAdmin, Number(currentAdmin.is_active) !== 1);
});

document.getElementById('closeEditAdminButton').addEventListener('click', () => {
    editAdminPanel.hidden = true;
    currentAdmin = null;
});

adminFilter.addEventListener('change', loadAdmins);


// ----- When the page opens -----

updateDaysBox();
loadDashboard();
showTabFromAddress();