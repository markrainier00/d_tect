const statusModal = document.getElementById("status-modal");
const statusTitle = document.getElementById('status-title');
const statusContent = document.getElementById('status-content');

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

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error && errorDescription) {
        showStatus(
            "Password Reset Error",
            decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
            { 
                showButton: true,
                buttonText: "Okay",
                callback: () => {
                    window.location.href = '/';
                }
            }
        );

        window.location.hash = '';
    }
});


const supabaseClient = supabase.createClient(
    "https://yxvgwmxlznpxqmmiofuy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTU5NzYsImV4cCI6MjA2NzI3MTk3Nn0.4XZQOkWmI1CLq-FR3KM5sD7ohn0iHdcRqrf5-KFmkho"
);

document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || !confirmPassword) {
        showStatus("Set Password", "Please enter and confirm your new password.", { showButton: true });
        return;
    }

    if (newPassword !== confirmPassword) {
        showStatus("Set Password", "Passwords do not match.", { showButton: true });
        return;
    }

    try {
        const { data: { user: currentUser }, error: getUserError } = await supabaseClient.auth.getUser();

        if (getUserError || !currentUser) {
            showStatus("Error", "Could not retrieve user info.", { showButton: true });
            return;
        }

        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword,
            data: {
                name: currentUser.user_metadata.name,
                first_name: currentUser.user_metadata.first_name,
                last_name: currentUser.user_metadata.last_name,
                role: currentUser.user_metadata.role,
            }
        });

        if (error) {
            showStatus("Error Resetting Password", error.message, { showButton: true });
        } else {
            showStatus("Password Updated", "Your password has been successfully updated.", {
                showButton: false,
                callback: () => {
                    window.location.href = '/account';
                }
            });
        }
    } catch (err) {
        showStatus("Error", err.message || "An unexpected error occurred while updating your password.", { showButton: true });
    }
});