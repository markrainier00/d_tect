const usersTable = document.querySelector('#usersTable tbody')
const logTable = document.querySelector('#logTable tbody')

async function verifySuperAdmin() {
    try {
        const res = await fetch('/dtect/verify-superadmin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await res.json();

        if (!data.success) {
            window.location.href = "/";
        }
    } catch (err) {
        console.error("Error verifying superadmin:", err);
        window.location.href = "/";
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

        const toggleInput = tr.querySelector(`#toggle-${user.id}`);
        toggleInput.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const is_enabled = e.target.checked;

            try {
            const res = await fetch(`/api/users/${userId}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_enabled })
            });

            if (!res.ok) throw new Error('Failed to update user status');
            } catch (err) {
            alert('Error updating user: ' + err.message);
            }
        });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.closest('button').getAttribute('data-id');
            if (confirm('Are you sure you want to delete this user?')) {
            try {
                const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete user');
                fetchUsers(); // refresh list
            } catch (err) {
                alert('Error deleting user: ' + err.message);
            }
            }
        });
        });

    } catch (err) {
        alert('Error fetching users: ' + err.message);
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
    alert('Error fetching logs: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
    verifySuperAdmin();
    fetchUsers();
    fetchLogs();
    
    const resetBtn = document.getElementById('reset-btn');
    const forgotForm = document.getElementById('forgot-form');
    const forgotPassword = document.getElementById('forgot-password');
    const logout = document.getElementById('logout');

    // Open Modals
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
    });
    
    if (logout) {
        logout.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '/logout';
            }
        });
    }
    
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
});
