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

    if (isConfirmed && statusModal) {
        statusTitle.innerHTML = `Email Confirmed`;
        statusContent.innerHTML = `
            <br>Please wait for your account to be approved
            <br>by an Account Administrator before logging in.`;
        statusModal.style.display = "flex";

        setTimeout(() => {
            statusModal.style.display = "none"
            statusTitle.innerHTML = ``;
            statusContent.innerHTML = ``;
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
                        statusTitle.innerHTML = `Log In Error`;
                        statusContent.innerHTML = `You don't have access to this system.`;
                        
                        setTimeout(() => {
                            statusModal.style.display = "none"
                            statusTitle.innerHTML = ``;
                            statusContent.innerHTML = ``;
                        }, 3000);
                    }
                } else {
                    statusTitle.innerHTML = `Log In Error`;
                    statusContent.innerHTML = `An error occured during log in.`;
                    
                    setTimeout(() => {
                        statusModal.style.display = "none"
                        statusTitle.innerHTML = ``;
                        statusContent.innerHTML = ``;
                    }, 3000);
                }
            } catch (error) {
                console.error("Login error:", error);

                statusTitle.innerHTML = `Log In Error`;
                statusContent.innerHTML = `An error occured during log in.`;

                setTimeout(() => {
                    statusModal.style.display = "none"
                    statusTitle.innerHTML = ``;
                    statusContent.innerHTML = ``;
                }, 3000);
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
                    statusTitle.innerHTML = `Sign Up Error`;
                    statusContent.innerHTML = `An error occured during sign up.`;

                    setTimeout(() => {
                        statusModal.style.display = "none"
                        statusTitle.innerHTML = ``;
                        statusContent.innerHTML = ``;
                    }, 3000);
                    return;
                }

                statusTitle.innerHTML = `Signed Up Successfully`;
                statusContent.innerHTML = `Please check your email for confirmation.`;

                setTimeout(() => {
                    statusModal.style.display = "none"
                    statusTitle.innerHTML = ``;
                    statusContent.innerHTML = ``;
                }, 3000);
                signupForm.reset();
                signup.style.display = 'none';
            } catch (error) {
                console.error('Sign up error:', error);

                statusTitle.innerHTML = `Sign Up Error`;
                statusContent.innerHTML = `Something went wrong during sign up.`;

                setTimeout(() => {
                    statusModal.style.display = "none"
                    statusTitle.innerHTML = ``;
                    statusContent.innerHTML = ``;
                }, 3000);
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

                if (!res.ok || !data.success) throw new Error(data.message || 'Password reset failed');

                statusTitle.innerHTML = `Reset Password`;
                statusContent.innerHTML = `A password reset link has been sent to your email.`;
            }
            catch {
                statusTitle.innerHTML = `Reset Password Failed`;
                statusContent.innerHTML = `An error occured during password reset.`;
            }
            finally {
                statusModal.style.display = "flex";
                setTimeout(() => {
                    statusModal.style.display = "none";
                    statusTitle.innerHTML = ``;
                    statusContent.innerHTML = ``;
                }, 3000);

                forgotPassword.style.display = 'none';
                forgotForm.reset();
            }
        });
    }
});