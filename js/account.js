document.addEventListener("DOMContentLoaded", () => {
    const signupBtn = document.getElementById('signup-btn');
    const forgotBtn = document.getElementById('forgot-password-btn');
    const login = document.getElementById('login');
    const signup = document.getElementById('signup');
    const forgotPassword = document.getElementById('forgot-password');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-form');
    const params = new URLSearchParams(window.location.search);
    const isConfirmed = params.get("status") === "confirmed";
    const statusModal = document.getElementById("status-modal");
    const statusTitle = document.getElementById('status-title');
    const statusContent = document.getElementById('status-content');

    function showStatus(title, message, options = {}) {
        const { duration = 3000, showButton = false, buttonText = "Okay", callback = null } = options;
        if (!statusModal || !statusTitle || !statusContent) return;

        statusTitle.innerHTML = title;
        statusContent.innerHTML = message;

        if (showButton) {
            const btn = document.createElement("button");
            btn.textContent = buttonText;
            btn.classList.add("status-ok-btn");
            btn.addEventListener("click", () => {
                statusModal.style.display = "none";
                statusTitle.innerHTML = "";
                statusContent.innerHTML = "";
                btn.remove();
                if (typeof callback === "function") callback();
            });
            statusContent.appendChild(document.createElement("br"));
            statusContent.appendChild(btn);
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

    if (isConfirmed && statusModal) {
        showStatus("Email Confirmed",`
            <br>Please wait for your account to be approved
            <br>by an Account Administrator before logging in.
        `, { 
            showButton: true,
            callback: () => window.history.replaceState({}, document.title, window.location.pathname)
        });
    }

    // Open Modals
    if (signupBtn && signup) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signup.style.display = 'flex';
        });
    }

    if (forgotBtn && forgotPassword) {
        forgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPassword.style.display = 'flex';
        });
    }

    // To Close Modals (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === signup || e.target === forgotPassword) {
            if (signup) signup.style.display = 'none';
            if (forgotPassword) forgotPassword.style.display = 'none';
            if (signupForm) signupForm.reset();
            if (forgotForm) forgotForm.reset();
        }
    });

    // Log In
    if (loginForm && login) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = login.querySelector('#login-email').value;
            const password = login.querySelector('#login-password').value;

            try {
                const response = await fetch('/dtect/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                const data = await response.json();
                const message = data.message || "An error occurred during log in.";

                if (data.success) {
                    window.location.href = '/private';
                } else {
                    showStatus("Log In Failed", message, { showButton: true });
                }
            } catch (error) {
                console.error("Login error:", error);
                showStatus("Log In Error",`An error occured during log in.`, { showButton: true });
            }
        });
    }

    // Sign Up
    if (signupForm && signup) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstname = signup.querySelector('#firstname').value.trim();
            const lastname = signup.querySelector('#lastname').value.trim();
            const role = document.getElementById('user-role')?.value || '';
            const email = signup.querySelector('#signup-email').value;
            const password = signup.querySelector('#signup-password').value;

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
                    body: JSON.stringify({ email, password, first_name, last_name, role }),
                });

                const data = await response.json();
                const message = data.message || "An error occurred during log in.";

                if (!response.ok || !data.success) {
                    showStatus("Sign Up Error", message, { showButton: true });
                    return;
                }
                showStatus("Signed Up Successfully", message, { showButton: false });
            } catch (error) {
                console.error('Sign up error:', error);
                showStatus("Sign Up Error",`Something went wrong during sign up.`, { showButton: true });
            } finally {
                signupForm.reset();
                signup.style.display = 'none';
            }
        });
    }

    // Forgot Password
    if (forgotForm && forgotPassword) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = forgotPassword.querySelector('#reset-email').value;
            try {
                const res = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();
                const message = data.message || "Password reset failed.";

                if (!res.ok || !data.success) throw new Error(message);

                showStatus("Reset Password", message, { showButton: false });
            }
            catch {
                showStatus("Reset Password Failed",`An error occured during password reset.`, { showButton: true });
            }
            finally {
                forgotPassword.style.display = 'none';
                forgotForm.reset();
            }
        });
    }
});