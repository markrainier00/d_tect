const supabaseClient = supabase.createClient(
    "https://yxvgwmxlznpxqmmiofuy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTU5NzYsImV4cCI6MjA2NzI3MTk3Nn0.4XZQOkWmI1CLq-FR3KM5sD7ohn0iHdcRqrf5-KFmkho"
);

document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || !confirmPassword) {
        alert('Please enter and confirm your new password.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert('Error resetting password: ' + error.message);
        } else {
            alert('Password has been successfully updated!');
            window.location.href = '/account.html';
        }
    } catch (err) {
        alert('Error updating password: ' + err.message);
    }
});