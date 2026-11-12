
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('applicationForm');
    const message = document.getElementById('message');
    const applicationList = document.getElementById('applicationList');
    const passportInfo = document.getElementById('passportInfo');
    const submitButton = document.getElementById('submitButton');
    const documentInput = document.getElementById('documents');

    if (!form) return;

    // Load passport and application information
    async function loadApplications() {
        try {
            const response = await fetch('/api/applications');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            if (!data.passport) {
                passportInfo.textContent =
                    'You must complete your profile and passport details before applying.';

                submitButton.disabled = true;
            } else {
                const expiry = new Date(data.passport.expiry_date)
                    .toLocaleDateString();

                passportInfo.textContent =
                    `Passport: ${data.passport.passport_number} | ` +
                    `Country: ${data.passport.country_of_issue} | ` +
                    `Expiry: ${expiry}`;

                submitButton.disabled = false;
            }

            applicationList.innerHTML = '';

            if (data.applications.length === 0) {
                applicationList.innerHTML = `
                    <tr>
                        <td colspan="5">No applications submitted yet.</td>
                    </tr>
                `;
                return;
            }

            data.applications.forEach(application => {
                const row = document.createElement('tr');

                const values = [
                    application.application_id,
                    application.visa_type,
                    application.destination_country,
                    new Date(application.application_date).toLocaleDateString(),
                    application.current_status
                ];

                values.forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                applicationList.appendChild(row);
            });

        } catch (error) {
            console.error(error);
            message.textContent =
                error.message || 'Could not load applications.';
        }
    }

    // Submit application with supporting documents
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const files = documentInput.files;

        // Check maximum number of documents
        if (files.length > 5) {
            message.textContent = 'You can upload a maximum of 5 documents.';
            return;
        }

        // Check individual file sizes
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                message.textContent =
                    `${file.name} exceeds the 10MB file size limit.`;
                return;
            }
        }

        // FormData includes the visa type and selected files
        const formData = new FormData(form);

        submitButton.disabled = true;
        message.textContent = 'Submitting your application...';

        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            message.textContent =
                `${result.message} Documents uploaded: ${result.documents_uploaded}.`;

            form.reset();

            await loadApplications();

        } catch (error) {
            console.error(error);
            message.textContent =
                error.message || 'Could not submit application.';
        } finally {
            submitButton.disabled = false;
        }
    });

    loadApplications();
});
