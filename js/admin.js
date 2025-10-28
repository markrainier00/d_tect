const supabaseClient = supabase.createClient(
    "https://yxvgwmxlznpxqmmiofuy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5NTk3NiwiZXhwIjoyMDY3MjcxOTc2fQ.nOfRegHNEriDk2Sioa5f3Aaa_CwPEhyCnPyB9aV6k8Y"
);

// prevention.js

const tableBody = document.querySelector('#preventionTable tbody');
const addNewBtn = document.getElementById('addNewBtn');

// Fetch and render all rows
async function fetchPreventionContent() {
    const { data, error } = await supabaseClient
        .from('prevention_content')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
        return;
    }
    tableBody.innerHTML = data.map(item => `
        <tr data-id="${item.id}">
            <td><textarea class="title-input">${item.title}</textarea></td>
            <td><textarea class="content-input">${item.content}</textarea></td>
            <td>
                <button class="update-btn">Update</button>
                <button class="delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');

    attachRowEventListeners();
    document.querySelectorAll('textarea').forEach(autoResizeTextarea);
}
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    document.addEventListener('input', (e) => {
        if (e.target.tagName.toLowerCase() === 'textarea') {
            autoResizeTextarea(e.target);
        }
    });


// Attach event listeners for update/delete buttons
function attachRowEventListeners() {
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const title = row.querySelector('.title-input').value;
            const content = row.querySelector('.content-input').value;

            const { error } = await supabaseClient
                .from('prevention_content')
                .update({ title, content })
                .eq('id', id);

            if (error) return alert('Update failed: ' + error.message);
            alert('Updated successfully!');
            fetchPreventionContent();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;

            const { error } = await supabaseClient
                .from('prevention_content')
                .delete()
                .eq('id', id);

            if (error) return alert('Delete failed: ' + error.message);
            fetchPreventionContent();
        });
    });
}

// Add new row
if (addNewBtn) {
    addNewBtn.addEventListener('click', async () => {
        const title = prompt("Enter title:");
        const content = prompt("Enter content:");

        if (!title || !content) return alert("Both fields are required!");

        const { error } = await supabaseClient
            .from('prevention_content')
            .insert([{ title, content }]);

        if (error) return alert('Insert failed: ' + error.message);
        fetchPreventionContent();
    });
}

// Initial load
fetchPreventionContent();


document.addEventListener('DOMContentLoaded', () => { 
    const infoModal = document.getElementById('info-modal');
    const infoBtn = document.getElementById('info-btn');
    // verifyAuthToken();

    // Open Modals
    if (infoBtn && infoModal) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            infoModal.style.display = 'flex';
        });
    }
    // To Close Modals (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            if (infoModal) infoModal.style.display = 'none';
        }
    });

});