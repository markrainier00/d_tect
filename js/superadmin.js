const supabaseClient = supabase.createClient(
    "https://yxvgwmxlznpxqmmiofuy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5NTk3NiwiZXhwIjoyMDY3MjcxOTc2fQ.nOfRegHNEriDk2Sioa5f3Aaa_CwPEhyCnPyB9aV6k8Y"
);

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
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, email, first_name, last_name, role, is_enabled')
        .neq('role', 'superadmin');

    if (error) {
        alert('Error fetching users: ' + error.message);
        return;
    }

    usersTable.innerHTML = ''; // clear existing rows

    data.forEach(user => {
        const fullName = `${user.first_name} ${user.last_name}`;
        const tr = document.createElement('tr');

        // Toggle switch HTML (checkbox with label)
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
            <td class="centered"><button data-id="${user.id}" class="delete-btn"><i class="fas fa-trash"></i></button></td>
        `;
        usersTable.appendChild(tr);

        // Event listener for toggle switch
        const toggleInput = tr.querySelector(`#toggle-${user.id}`);
        toggleInput.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-id');
            await toggleEnable(userId);
        });
    });

    // Event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this user?')) {
                await deleteUser(userId);
            }
        });
    });
}

async function toggleEnable(userId) {
    // Get current state of user
    const { data: user, error } = await supabaseClient
        .from('profiles')
        .select('is_enabled')
        .eq('id', userId)
        .single();

    if (error) {
        alert('Error fetching user: ' + error.message);
        return;
    }

    // Toggle the value
    const newEnabled = !user.is_enabled;

    const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ is_enabled: newEnabled })
        .eq('id', userId);

    if (updateError) {
        alert('Error updating user: ' + updateError.message);
        return;
    }

    alert(`User has been ${newEnabled ? 'enabled' : 'disabled'}.`);
    fetchUsers(); // Reload the user data
}

async function deleteUser(userId) {
    // Delete user profile
    const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId)

    if (error) {
        alert('Error deleting user: ' + error.message)
        return
    }

    alert('User deleted successfully.')
    fetchUsers()
}

// Format UTC to Philippines Time (PHT)
function formatToPHTime(utcString) {
    const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return new Date(utcString).toLocaleString('en-PH', options);
}

async function fetchLogs() {
    const { data, error } = await supabaseClient
        .from('login_logs')
        .select('id, email, first_name, last_name, role, logged_in_at')

    if (error) {
        alert('Error fetching users: ' + error.message)
        return
    }

    logTable.innerHTML = '' // clear existing rows

    data.forEach(user => {
        const fullName = `${user.first_name} ${user.last_name}`;
        const tr = document.createElement('tr')

        tr.innerHTML = `
        <td>${user.email}</td>
        <td>${fullName}</td>
        <td>${user.role}</td>
        <td>${formatToPHTime(user.logged_in_at)}</td>
        `

        logTable.appendChild(tr)
    })
}

document.addEventListener('DOMContentLoaded', () => {
    verifySuperAdmin();
    fetchUsers();
    fetchLogs();
    
    // Logout
    if (logout) {
        logout.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '/logout';
            }
        });
    }
});
