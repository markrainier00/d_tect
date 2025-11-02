const preventionHeader = document.querySelector('#preventionheaderTable tbody');
const preventionContent = document.querySelector('#preventionTable tbody');
const contactsTable = document.querySelector('#contactsTable tbody');
const referencesTable = document.querySelector('#referencesTable tbody');
    
async function verifyAuthToken() {
    try {
        const res = await fetch('/dtect/verify-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) {
            window.location.href = "/";
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        window.location.href = "/";
    }
}
verifyAuthToken();

async function fetchContent() {
    try {
        const response = await fetch("/api/fetchContent");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to fetch content");

        // Prevention content
        preventionContent.innerHTML = result.preventionContentData.map(item => `
            <tr data-id="${item.id}" data-table="prevention_content">
                <td><textarea class="title-input">${item.title}</textarea></td>
                <td><textarea class="content-input">${item.content}</textarea></td>
                <td>
                    <button class="update-btn">Update</button>
                    <button class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('');

        // Prevention header
        preventionHeader.innerHTML = result.preventionHeaderData.map(item => `
            <tr data-id="${item.id}" data-table="site_content">
                <td><textarea class="headercontent-input">${item.value}</textarea></td>
                <td>
                    <button class="update-btn">Update</button>
                </td>
            </tr>
        `).join('');

        // References
        referencesTable.innerHTML = result.referencesData.map(item => `
            <tr data-id="${item.id}" data-table="references">
                <td><textarea class="titleref-input">${item.title}</textarea></td>
                <td><textarea class="href-input">${item.href}</textarea></td>
                <td>
                    <button class="update-btn">Update</button>
                    <button class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('');

        // Contacts
        contactsTable.innerHTML = result.contactData.map(item => `
            <tr data-id="${item.id}" data-table="contact_details">
                <td><textarea class="office-input">${item.office_name}</textarea></td>
                <td><textarea class="address-input">${item.address}</textarea></td>
                <td><textarea class="phone-input">${item.phone}</textarea></td>
                <td><textarea class="email-input">${item.email}</textarea></td>
                <td><textarea class="facebook-input">${item.facebook_url}</textarea></td>
                <td>
                    <button class="update-btn">Update</button>
                    <button class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('');

        attachRowEventListeners();
        document.querySelectorAll('textarea').forEach(autoResizeTextarea);

    } catch (err) {
        console.error("Error loading content:", err);
        preventionContent.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
        preventionHeader.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
        referencesTable.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
        contactsTable.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
    }
}

// Fetch and render all rows
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

document.addEventListener('input', (e) => {
    if (e.target.tagName.toLowerCase() === 'textarea') {
        autoResizeTextarea(e.target);
    }
});

function resizeAllTextareas() {
    document.querySelectorAll('textarea').forEach(autoResizeTextarea);
}

function attachRowEventListeners() {
    // Update button
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const table = row.dataset.table;
            const id = row.dataset.id;
            let updateData;

            if (table === 'site_content') {
                updateData = {
                    value: row.querySelector('.headercontent-input').value
                };
            } else if (table === 'prevention_content') {
                updateData = {
                    title: row.querySelector('.title-input').value,
                    content: row.querySelector('.content-input').value
                };
            } else if (table === 'references') {
                updateData = {
                    title: row.querySelector('.titleref-input').value,
                    href: row.querySelector('.href-input').value
                };
            } else if (table === 'contact_details') {
                updateData = {
                    office_name: row.querySelector('.office-input').value,
                    address: row.querySelector('.address-input').value,
                    phone: row.querySelector('.phone-input').value,
                    email: row.querySelector('.email-input').value,
                    facebook_url: row.querySelector('.facebook-input').value
                };
            }

            try {
                const res = await fetch('/api/updateContent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table, id, updateData })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Update failed");

                alert('Row updated successfully!');
                fetchContent();
            } catch (err) {
                alert('Update failed: ' + err.message);
            }
        });
    });

    // Delete button
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const table = row.dataset.table;
            const id = row.dataset.id;

            if (!confirm("Are you sure you want to delete this item?")) return;

            try {
                const res = await fetch('/api/deleteContent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table, id })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Delete failed");

                alert('Row deleted successfully!');
                fetchContent();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => { 
    fetchContent();
    resizeAllTextareas();
    
    const resetBtn = document.getElementById('reset-btn');
    const forgotForm = document.getElementById('forgot-form');
    const forgotPassword = document.getElementById('forgot-password');
    const addPrevConBtn = document.getElementById('add-prevention-content');
    const addPrevention = document.getElementById('addPrevention');
    const addPreventionForm = document.getElementById('addPreventionForm');
    const addContactBtn = document.getElementById('add-contact');
    const addContact = document.getElementById('addContact');
    const addContactForm = document.getElementById('addContactForm');
    const addReferenceBtn = document.getElementById('add-references');
    const addReference = document.getElementById('addReference');
    const addReferenceForm = document.getElementById('addReferenceForm');

    // Table responsiveness
    document.addEventListener('input', (e) => {
        if (e.target.tagName.toLowerCase() === 'textarea') {
            autoResizeTextarea(e.target);
        }
    });
    window.addEventListener('resize', resizeAllTextareas);

    // Open Modals
    if (resetBtn && forgotPassword) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPassword.style.display = 'flex';
        });
    }
    if (addPrevConBtn) {
        addPrevConBtn.addEventListener('click', () => {
            addPrevention.style.display = 'flex';
        });
    }
    if (addReferenceBtn) {
        addReferenceBtn.addEventListener('click', () => {
            addReference.style.display = 'flex';
        });
    }
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            addContact.style.display = 'flex';
        });
    }

    // To Close Modals
    window.addEventListener('click', (e) => {
        if (e.target === forgotPassword || e.target === addPrevention || e.target === addReference || e.target === addContact) {
            if (forgotPassword) forgotPassword.style.display = 'none';
            if (forgotForm) forgotForm.reset(); 
            if (addPrevention) addPrevention.style.display = 'none';
            if (addPreventionForm) addPreventionForm.reset();
            if (addReference) addReference.style.display = 'none';
            if (addReferenceForm) addReferenceForm.reset();
            if (addContact) addContact.style.display = 'none';
            if (addContactForm) addContactForm.reset();
        }
    });

    // Reset password
    if (forgotForm && forgotPassword) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = forgotPassword.querySelector('#reset-email').value;
            if (!email) {
                alert('Please enter your email.');
                return;
            }
            
            try {
                const res = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Failed to reset password');

                if (confirm("You need to log out to reset your password.")) {
                    alert(data.message);
                    forgotPassword.style.display = 'none';
                    forgotForm.reset();
                    window.location.href = '/logout';
                }

            } catch (err) {
                alert('Error: ' + err.message);
            }
        });
    }

    // Logout
    if (logout) {
        logout.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '/logout';
            }
        });
    }

    // Add prevention content
    addPreventionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('newTitle').value.trim();
        const content = document.getElementById('newContent').value.trim();

        if (!title || !content) {
            alert("Both fields are required!");
            return;
        }

        try {
            const res = await fetch('/api/addPrevention', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Insert failed");

            alert("New prevention content added successfully!");
            fetchContent();  // Refresh the table
            addPrevention.style.display = 'none';
            addPreventionForm.reset();
        } catch (err) {
            alert("Insert failed: " + err.message);
        }
    });

    // Add source
    addReferenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('newrefTitle').value.trim();
        const href = document.getElementById('newLink').value.trim();

        if (!title || !href) {
            alert("Both fields are required!");
            return;
        }

        try {
            const res = await fetch('/api/addReference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, href })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Insert failed");

            alert("New reference added successfully!");
            fetchContent();  // refresh table data
            addReference.style.display = 'none';
            addReferenceForm.reset();
        } catch (err) {
            alert("Insert failed: " + err.message);
        }
    });

    // Add contact
    addContactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const office_name = document.getElementById('newOffice').value.trim();
        const address = document.getElementById('newAddress').value.trim();
        const phone = document.getElementById('newPhone').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const facebook_url = document.getElementById('newFacebook').value.trim();

        if (!office_name || !address) {
            alert("Office name and address are required!");
            return;
        }

        try {
            const res = await fetch('/api/addContact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ office_name, address, phone, email, facebook_url })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Insert failed");

            alert("New contact added successfully!");
            fetchContent();  // refresh data
            addContact.style.display = 'none';
            addContactForm.reset();
        } catch (err) {
            alert("Insert failed: " + err.message);
        }
    });
});