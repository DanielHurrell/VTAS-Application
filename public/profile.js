
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('profileForm');
    const message = document.getElementById('message');

    if (!form) return;

    // Load existing profile information
    try {
        const response = await fetch('/api/profile');

        if (!response.ok) {
            message.textContent = 'Could not load profile information.';
            return;
        }

        const profile = await response.json();

        Object.keys(profile).forEach(key => {
            const field = form.elements.namedItem(key);

            if (field && profile[key]) {
                if (['date_of_birth', 'issue_date', 'expiry_date'].includes(key)) {
                    field.value = new Date(profile[key]).toISOString().split('T')[0];
                } else {
                    field.value = profile[key];
                }
            }
        });

    } catch (error) {
        console.error(error);
        message.textContent = 'Could not connect to the server.';
    }

    // Save profile information
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = Object.fromEntries(new FormData(form));

        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            message.textContent = result.message;

        } catch (error) {
            console.error(error);
            message.textContent = 'Could not save profile.';
        }
    });
});
