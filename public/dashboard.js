document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();

    document.getElementById('markAllReadButton')
        .addEventListener('click', markAllAsRead);
});


// Escape text before displaying database content in HTML
function escapeHTML(value) {
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


// Check whether a notification has been read
function notificationIsRead(notification) {
    return notification.is_read === true ||
           Number(notification.is_read) === 1;
}


// Load notifications from the database
async function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    const unreadCount = document.getElementById('unreadCount');
    const markAllButton = document.getElementById('markAllReadButton');

    try {
        const response = await fetch('/api/notifications');

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const notifications = data.notifications || [];
        const unread = Number(data.unreadCount) || 0;

        unreadCount.textContent = `${unread} unread`;
        unreadCount.className = unread > 0
            ? 'unread-summary has-unread'
            : 'unread-summary';

        updateNotificationBell(unread, notifications);

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-notifications">
                    <span>🔔</span>
                    <h4>You're all caught up!</h4>
                    <p>You don't have any notifications yet.</p>
                </div>
            `;

            markAllButton.hidden = true;
            return;
        }

        let html = '';

        notifications.forEach(notification => {
            const isRead = notificationIsRead(notification);

            html += `
                <div class="notification-card ${isRead ? 'read' : 'unread'}">

                    <div class="notification-card-header">
                        <div class="notification-title">
                            <span class="notification-indicator"></span>
                            <h4>${escapeHTML(notification.notification_type)}</h4>
                        </div>

                        <span class="notification-status ${isRead ? 'status-read' : 'status-unread'}">
                            ${isRead ? 'Read' : 'Unread'}
                        </span>
                    </div>

                    <div class="notification-message">
                        <p>${escapeHTML(notification.message)}</p>
                    </div>

                    <div class="notification-card-footer">
                        <small>${new Date(notification.created_at).toLocaleString()}</small>

                        ${
                            isRead
                                ? ''
                                : `<button type="button"
                                    class="small-button"
                                    onclick="markAsRead(${Number(notification.notification_id)})">
                                    Mark as read
                                   </button>`
                        }
                    </div>

                </div>
            `;
        });

        container.innerHTML = html;
        markAllButton.hidden = unread === 0;

    } catch (error) {
        console.error('Notification loading error:', error);

        container.innerHTML = `
            <div class="empty-notifications">
                <p class="error-text">Unable to load notifications.</p>
            </div>
        `;

        unreadCount.textContent = '';
        markAllButton.hidden = true;
    }
}


// Update the bell badge and dropdown
function updateNotificationBell(unread, notifications) {
    const badge = document.getElementById('bellUnreadCount');
    const dropdown = document.getElementById('dropdownNotifications');

    if (!badge || !dropdown) {
        console.error('Notification bell elements are missing from dashboard.html');
        return;
    }

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
        const isRead = notificationIsRead(notification);

        html += `
            <div class="dropdown-notification ${isRead ? 'read' : 'unread'}">

                <div class="dropdown-notification-header">
                    <strong>${escapeHTML(notification.notification_type)}</strong>
                    <span class="notification-indicator"></span>
                </div>

                <p>${escapeHTML(notification.message)}</p>

                <div class="dropdown-notification-footer">
                    <small>${new Date(notification.created_at).toLocaleString()}</small>

                    ${
                        isRead
                            ? ''
                            : `<button type="button"
                                onclick="markAsRead(${Number(notification.notification_id)})">
                                Mark as read
                               </button>`
                    }
                </div>

            </div>
        `;
    });

    dropdown.innerHTML = html;
}


// Open or close the notification dropdown
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');

    dropdown.hidden = !dropdown.hidden;
}


// Close the notification dropdown
function closeNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');

    if (dropdown) {
        dropdown.hidden = true;
    }
}


// Mark an individual notification as read
async function markAsRead(notificationId) {
    try {
        const response = await fetch(
            `/api/notifications/${notificationId}/read`,
            { method: 'PATCH' }
        );

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        await loadNotifications();

    } catch (error) {
        console.error('Mark as read error:', error);
        alert('Could not mark notification as read.');
    }
}


// Mark all notifications as read
async function markAllAsRead() {
    try {
        const response = await fetch('/api/notifications/read-all', {
            method: 'PATCH'
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        await loadNotifications();

    } catch (error) {
        console.error('Mark all as read error:', error);
        alert('Could not mark notifications as read.');
    }
}
