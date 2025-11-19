const usersTable = document.querySelector('#usersTable tbody')
const logTable = document.querySelector('#logTable tbody')
let deleteUserId = null;
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const statusModal = document.getElementById("status-modal");
const statusTitle = document.getElementById('status-title');
const statusContent = document.getElementById('status-content');

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
        window.location.href = "/";
    }
}
verifyAuthToken();

function showStatus(title, message, options = {}) {
    const {
        duration = 3000,
        showButton = false,
        buttonText = "Okay",
        callback = null,
        cancelButtonText = null,
        cancelCallback = null
    } = options;

    if (!statusModal || !statusTitle || !statusContent) return;

    statusTitle.innerHTML = title;
    statusContent.innerHTML = message;

    const confirmBtn = document.getElementById("status-ok-btn");
    const cancelBtn = document.getElementById("status-cancel-btn");

    confirmBtn.style.display = "none";
    cancelBtn.style.display = "none";

    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    const okButton = document.getElementById("status-ok-btn");
    const cancelButton = document.getElementById("status-cancel-btn");

    if (showButton) {
        okButton.textContent = buttonText;
        okButton.style.display = "inline-block";
        okButton.addEventListener("click", () => {
            statusModal.style.display = "none";
            statusTitle.innerHTML = "";
            statusContent.innerHTML = "";
            if (typeof callback === "function") callback();
        });

        if (cancelButtonText) {
            cancelButton.textContent = cancelButtonText;
            cancelButton.style.display = "inline-block";
            cancelButton.addEventListener("click", () => {
                statusModal.style.display = "none";
                statusTitle.innerHTML = "";
                statusContent.innerHTML = "";
                if (typeof cancelCallback === "function") cancelCallback();
            });
        }
    }

    statusModal.style.display = "flex";

    if (!showButton) {
        setTimeout(() => {
            statusModal.style.display = "none";
            statusTitle.innerHTML = "";
            statusContent.innerHTML = "";
            if (typeof callback === "function") callback();
        }, duration);
    }
}

async function fetchUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();

        usersTable.innerHTML = '';

        data.forEach(user => {
            const fullName = `${user.first_name} ${user.last_name}`;
            const tr = document.createElement('tr');

            const toggleSwitch = `
                <div class="switch">
                    <input type="checkbox" id="toggle-${user.id}" ${user.is_enabled ? 'checked' : ''} data-id="${user.id}">
                    <label for="toggle-${user.id}"></label>
                </div>
            `;

            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${fullName}</td>
                <td>${user.role}</td>
                <td>${toggleSwitch}</td>
                <td class="centered">
                    <button data-id="${user.id}" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            usersTable.appendChild(tr);

            // Enable/Disable ssers
            const toggleInput = tr.querySelector(`#toggle-${user.id}`);
            toggleInput.addEventListener('change', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const is_enabled = e.target.checked;
                const previousState = !is_enabled;

                try {
                    const res = await fetch(`/api/users/${userId}/toggle`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_enabled })
                    });

                    const data = await res.json();
                    const message = data.message;

                    if (!res.ok || (data && data.success === false)) {
                        throw new Error(data.message);
                    }
                    showStatus("D-TECT", message, { showButton: false });

                } catch (err) {
                    e.target.checked = previousState;
                    showStatus("D-TECT", "Failed to update user status.", { showButton: true });
                }
            });

            //Delete users
            const deleteBtn = tr.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteUserId = user.id;
                deleteModal.style.display = 'block';
            });
        });


    } catch (err) {
        showStatus("D-TECT", "Unable to load users.", { showButton: true });
    }
}
async function fetchLogs() {
    try {
        const res = await fetch('/api/logs');
        if (!res.ok) throw new Error('Failed to fetch logs');

        const data = await res.json();
        logTable.innerHTML = ''; // clear existing rows

        data.forEach(user => {
        const fullName = `${user.first_name} ${user.last_name}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${fullName}</td>
            <td>${user.role}</td>
            <td>${user.logged_in_at}</td> <!-- already formatted -->
        `;
        logTable.appendChild(tr);
        });

    } catch (err) {
        showStatus("D-TECT", "Failed to retrieve logs.", { showButton: true });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    fetchLogs();
    
    const resetBtn = document.getElementById('reset-btn');
    const forgotForm = document.getElementById('forgot-form');
    const forgotPassword = document.getElementById('forgot-password');
    const logout = document.getElementById('logout');
    const signupBtn = document.getElementById('signup-btn');
    const signup = document.getElementById('signup');
    const signupForm = document.getElementById('signup-form');

    // Open Modals
    if (signupBtn && signup) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signup.style.display = 'flex';
        });
    }

    if (resetBtn && forgotPassword) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPassword.style.display = 'flex';
        });
    }
    
    // To Close Modals (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === forgotPassword) {
            forgotPassword.style.display = 'none';
            forgotForm.reset();
        }
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
            deleteUserId = null;
        }
        if (e.target === signup) {
            signup.style.display = 'none';
            signupForm.reset();
        }
    });
    
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        deleteUserId = null;
    });

    // Sign Up
    if (signupForm && signup) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstname = signup.querySelector('#firstname').value.trim();
            const lastname = signup.querySelector('#lastname').value.trim();
            const role = document.getElementById('user-role')?.value || '';
            const email = signup.querySelector('#signup-email').value;

            const capitalizeWords = (str) =>
                str
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase());

            const first_name = capitalizeWords(firstname);
            const last_name = capitalizeWords(lastname);
            
            try {
                const response = await fetch('/dtect/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, first_name, last_name, role }),
                });

                const data = await response.json();
                const message = data.message || "An error occurred during account creation.";

                if (!response.ok || !data.success) {
                    showStatus("Sign Up Error", message, { showButton: true });
                    return;
                }
                showStatus("Account Created", message, { showButton: false });

                fetchUsers();
            } catch (error) {
                console.error('Account creation error:', error);
                showStatus("Account creation Error",`Something went wrong during account creation.`, { showButton: true });
            } finally {
                signupForm.reset();
                signup.style.display = 'none';
            }
        });
    }

    // Log out
    if (logout) {
        logout.addEventListener('click', () => {
            showStatus("Log Out", "Are you sure you want to log out?", {
                showButton: true,
                buttonText: "Log Out",
                cancelButtonText: "Cancel",
                callback: () => {
                    window.location.href = '/logout';
                }
            });
        });
    }
    
    // Reset password
    if (forgotForm && forgotPassword) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = forgotPassword.querySelector('#reset-email').value;
            
            showStatus("Reset Password", "You need to log out to reset your password. Proceed?", {
                showButton: true,
                buttonText: "Proceed",
                cancelButtonText: "Cancel",
                callback: async () => {
                    try {
                        const res = await fetch('/api/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });

                        const data = await res.json();

                        if (!res.ok) throw new Error(data.error || 'Failed to reset password');

                        showStatus("Reset Password", data.message, {
                            showButton: false,
                            callback: () => {
                                forgotPassword.style.display = 'none';
                                forgotForm.reset();
                                window.location.href = '/logout';
                            }
                        });

                    } catch (err) {
                        showStatus("Error", err.message, { showButton: true });
                    }
                }
            });
        });
    }
    
    // Confirm deletion
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteUserId) return;

        try {
            const res = await fetch(`/api/users/${deleteUserId}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok || (data && data.success === false)) {
                throw new Error(data.message || 'Failed to delete user');
            }
            const message = data.message || 'User deleted successfully.';
            showStatus("D-TECT", message, { showButton: false });

            fetchUsers();
        } catch (err) {
            showStatus("D-TECT", err.message, { showButton: true });
        } finally {
            deleteModal.style.display = 'none';
            deleteUserId = null;
        }
    });
});
