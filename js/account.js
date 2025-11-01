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
    const confirmationModal = document.getElementById("confirmation-modal");

    if (isConfirmed && confirmationModal) {
        confirmationModal.style.display = "flex";

        setTimeout(() => {
            confirmationModal.style.display = "none"
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 3000);
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

                if (data.success) {
                    const role = data.user.role;

                    if (['Healthcare Staff', 'System Administrator', 'Account Administrator', 'superadmin'].includes(role)) {
                        window.location.href = '/private';
                    } else {
                        alert("You don't have access to this system.");
                    }
                } else {
                    alert(data.message || "Login failed.");
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("An error occurred during login.");
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

                const result = await response.json();

                if (!response.ok || !result.success) {
                    alert(result.message || 'Sign up failed');
                    return;
                }

                alert('Signed up successfully! Please check your email for confirmation.');
                signupForm.reset();
                signup.style.display = 'none';
            } catch (error) {
                console.error('Sign up error:', error);
                alert('Something went wrong during sign up.');
            }
        });
    }

    // Forgot Password
    if (forgotForm && forgotPassword) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = forgotPassword.querySelector('#reset-email').value;
            
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            alert('A password reset link has been sent to your email.');
            forgotPassword.style.display = 'none';
            forgotForm.reset();
        });
    }
});