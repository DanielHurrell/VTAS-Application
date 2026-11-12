
document.addEventListener('DOMContentLoaded', async () => {
    const nav = document.querySelector('nav');

    if (!nav) return;

    try {
        const response = await fetch('/auth/status');
        const data = await response.json();

        if (!data.loggedIn) {
            nav.innerHTML = `
                <a href="/">Home</a>
                <a href="/pages/login.html">Login</a>
                <a href="/pages/register.html">Register</a>
            `;
        } else {
            let dashboardLink = '';

            if (data.user.role === 'admin') {
                dashboardLink = `
                    <a href="/pages/admin.html#dashboard" class="tab-link" data-tab="dashboard">Admin Dashboard</a>
                    <a href="/pages/admin.html#applications" class="tab-link" data-tab="applications">Applications</a>
                    <a href="/pages/admin.html#reports" class="tab-link" data-tab="reports">Reports</a>
                    ${data.user.is_super_admin ? '<a href="/pages/admin.html#admins" class="tab-link" data-tab="admins">Admins</a>' : ''}
                `;
            } else {
                dashboardLink = `
                    <a href="/pages/dashboard.html">Dashboard</a>
                    <a href="/pages/profile.html">My Profile</a>
                    <a href="/pages/applications.html">Visa Applications</a>
                `;
            }

            nav.innerHTML = `
                <a href="/">Home</a>
                ${dashboardLink}
                <a href="/auth/logout">Logout</a>

                ${data.user.role === 'applicant' ? `
                    <div class="notification-menu">
                        <button type="button" id="notificationBell" class="notification-bell">
                            <span>🔔</span>
                            <span id="bellUnreadCount" class="notification-badge" hidden>0</span>
                        </button>

                        <div id="notificationDropdown" class="notification-dropdown" hidden>
                            <div class="notification-dropdown-header">
                                <strong>Notifications</strong>
                                <button type="button" id="closeNotifications">×</button>
                            </div>

                            <div id="dropdownNotifications">
                                <p>Loading notifications...</p>
                            </div>

                            <a href="/pages/dashboard.html" class="view-all-notifications">
                                View all notifications
                            </a>
                        </div>
                    </div>
                ` : ''}
            `;

            // Notification dropdown functionality for all applicant pages
            if (data.user.role === 'applicant') {
                const bell = document.getElementById('notificationBell');
                const dropdown = document.getElementById('notificationDropdown');
                const closeButton = document.getElementById('closeNotifications');

                bell.addEventListener('click', () => {
                    dropdown.hidden = !dropdown.hidden;
                });

                closeButton.addEventListener('click', () => {
                    dropdown.hidden = true;
                });

                document.addEventListener('click', (event) => {
                    const menu = document.querySelector('.notification-menu');

                    if (menu && !menu.contains(event.target)) {
                        dropdown.hidden = true;
                    }
                });

                // Load notification preview for the bell
                loadNavigationNotifications();
            }

            // Tell the admin page the menu is ready, so it can highlight the open tab
            window.dispatchEvent(new Event('hashchange'));
        }

    } catch (error) {
        console.error('Could not load navigation:', error);
    }
});


// Load notifications for the navigation bell
async function loadNavigationNotifications() {
    try {
        const response = await fetch('/api/notifications');

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        const notifications = data.notifications || [];
        const unread = Number(data.unreadCount) || 0;

        const badge = document.getElementById('bellUnreadCount');
        const dropdown = document.getElementById('dropdownNotifications');

        if (!badge || !dropdown) return;

        badge.textContent = unread > 9 ? '9+' : unread;
        badge.hidden = unread === 0;

        const recentNotifications = notifications.slice(0, 5);

        if (recentNotifications.length === 0) {
            dropdown.innerHTML = `
                <div class="dropdown-empty">
                    <p>No notifications yet.</p>
                </div>
            `;
            return;
        }

        let html = '';

        recentNotifications.forEach(notification => {
            const isRead = notification.is_read === true ||
                           Number(notification.is_read) === 1;

            html += `
                <div class="dropdown-notification ${isRead ? 'read' : 'unread'}">
                    <div class="dropdown-notification-header">
                        <strong>${escapeNavigationHTML(notification.notification_type)}</strong>
                        <span class="notification-indicator"></span>
                    </div>

                    <p>${escapeNavigationHTML(notification.message)}</p>

                    <div class="dropdown-notification-footer">
                        <small>${new Date(notification.created_at).toLocaleString()}</small>

                        ${isRead ? '' : `
                            <button type="button"
                                onclick="markNavigationNotificationRead(${Number(notification.notification_id)})">
                                Mark as read
                            </button>
                        `}
                    </div>
                </div>
            `;
        });

        dropdown.innerHTML = html;

    } catch (error) {
        console.error('Could not load navigation notifications:', error);
    }
}


// Escape notification text before displaying it
function escapeNavigationHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => {
        const characters = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return characters[character];
    });
}


// Mark an individual notification as read from the dropdown
async function markNavigationNotificationRead(notificationId) {
    try {
        const response = await fetch(
            `/api/notifications/${notificationId}/read`,
            { method: 'PATCH' }
        );

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        await loadNavigationNotifications();

        // Refresh the dashboard notification list if present
        if (typeof loadNotifications === 'function') {
            await loadNotifications();
        }

    } catch (error) {
        console.error('Could not mark notification as read:', error);
        alert('Could not mark notification as read.');
    }
}
