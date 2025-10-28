require('dotenv').config();
const express = require("express");
const supabaseClient = require('./supabaseClient');
const { spawn } = require('child_process');
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

console.log(__dirname);
console.log(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});
app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'staff.html'));
});
app.get('/signup_success', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup_success.html'));
});
app.get('/account.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'account.html'));
});
app.get('/staff.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'staff.html'));
});
app.get('/reset.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'reset.html'));
});

// SignUp Process
app.post("/dtect/signup", async (req, res) => {
  const { email, password, role, first_name, last_name } = req.body;

  try {
    const { data, error: signupError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${first_name} ${last_name}`,
          first_name,
          last_name,
          role,
        },
      },
    });

    if (signupError) {
      console.error('Signup error:', signupError);
      return res.status(400).json({ success: false, message: signupError.message });
    }

    const user = data.user;
    if (!user || !user.id) {
      return res.status(500).json({ success: false, message: "User ID not found after signup" });
    }

    const { error: profileInsertError } = await supabaseClient.from("profiles").insert([
      {
        id: user.id,
        email,
        first_name,
        last_name,
        role,
        is_enabled: false, 
      },
    ]);

    if (profileInsertError) {
      console.error("Error inserting into profiles:", profileInsertError);
      return res.status(500).json({ success: false, message: "Failed to create user profile" });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error during signup:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/dtect/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ success: false, message: error.message });
    }

    // Check if user email is confirmed
    if (data.user && !data.user.email_confirmed_at) {
      return res.status(401).json({
        success: false,
        requiresConfirmation: true,
        message: "Please confirm your email address before logging in. Check your inbox for a confirmation email.",
      });
    }

    // Check if user has admin role
    const userRole = data.user?.user_metadata?.role;
    if (userRole && userRole !== "admin" && userRole !== "healthcare" && userRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Check if user profile is approved
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("is_enabled")
      .eq("id", data.user.id)
      .single();

    if (profilesError || !profiles?.is_enabled) {
      return res.status(403).json({ success: false, message: "Account not approved by admin yet." });
    }

    // Set the cookie
    res.cookie("access_token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // use HTTPS in production
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24,
    });

    // Get first_name, last_name, and role from profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile for logging login:", profileError);
    }

    // Insert login log
    await supabaseClient.from("login_logs").insert([
      {
        user_id: data.user.id,
        email: data.user.email,
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        role: profile?.role || "",
      },
    ]);

    // Sets the account (if login is successful)
    res.json({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/private", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.redirect("/");
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    res.clearCookie("access_token");
    return res.redirect("/");
  }
  const role = user.user_metadata?.role;
  if (role === "admin" || role === "healthcare") {
    res.sendFile(path.join(__dirname, "staff.html"));
  } else if (role === "superadmin") {
      res.sendFile(path.join(__dirname, "superadmin.html"));
  } else {
    return res.status(403).send("Access denied.");
  }
});

app.post("/dtect/verify-superadmin", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ success: false, message: "Missing token" });

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  if (user.user_metadata.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Not a superadmin" });
  }

  return res.json({ success: true, user: { id: user.id, email: user.email } });
});

app.get("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.redirect("/");
});

// Endpoint to check email confirmation status
app.get("/dtect/check-confirmation/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // Query the user to check confirmation status
    const { data: { users }, error } = await supabaseClient.auth.admin.listUsers();

    if (error) {
      return res.status(500).json({ success: false, message: "Error checking confirmation status" });
    }

    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      confirmed: !!user.email_confirmed_at,
      confirmedAt: user.email_confirmed_at,
    });
  } catch (error) {
    console.error("Confirmation check error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Endpoint to handle email confirmation callback
app.get("/dtect/confirm-email", async (req, res) => {
  const { token, type } = req.query;

  try {
    if (type === "signup") {
      res.redirect("/signup_success.html?confirmed=true");
    } else {
      res.status(400).json({ success: false, message: "Invalid confirmation type" });
    }
  } catch (error) {
    console.error("Email confirmation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Endpoint to verify authentication token
app.post("/dtect/verify-auth", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ success: false, message: "No token" });

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    res.clearCookie("access_token");
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  if (user.user_metadata.role !== "admin" && user.user_metadata.role !== "healthcare") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.user_metadata.role,
    },
  });
});

function runForecast() {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, 'forecast', 'forecast.py')
    const py = spawn('python', [script], {
      env: {
        ...process.env,
      },
      stdio: ['ignore', 'ignore', 'pipe']
    })

    let errorOutput = ''

    py.stderr.on('data', (err) => {
      errorOutput += err.toString()
    })

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(errorOutput || 'Python script failed'))
      }
      resolve()
    })
  })
}

app.get('/forecast', async (req, res) => {
  try {
    await runForecast()
    res.end()
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
