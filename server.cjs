require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const router = express.Router();
const supabaseClient = require('./supabaseClient');
const { spawn } = require('child_process');
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
app.use(bodyParser.json());
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
  if (role === "healthcare") {
    res.sendFile(path.join(__dirname, "staff.html"));
  } else if (role === "admin") {
      res.sendFile(path.join(__dirname, "admin.html"));
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
      res.redirect("/account.html?confirmed=true");
    } else {
      res.status(400).json({ success: false, message: "Invalid confirmation type" });
    }
  } catch (error) {
    console.error("Email confirmation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// =========RESET PASSWORD=========
app.post('/api/reset-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: '/reset.html'
    });

    if (error) throw error;

    res.json({ success: true, message: 'A password reset link has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========VERIFY USER=========
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
});

// ===========================HEALTHCARE STAFF===========================
const allowedGenders = ["Male", "Female"];
const allowedAgeGroups = ["0 to 10","11 to 20","21 to 30","31 to 40",
        "41 to 50","51 to 60","61 and above"];

function getMonthFromISOWeek(year, week) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const simple = new Date(year, 0, 4);
    const dayOfWeek = simple.getDay() || 7;
    const isoWeek1Monday = new Date(simple);
    isoWeek1Monday.setDate(simple.getDate() - (dayOfWeek - 1));

    const targetDate = new Date(isoWeek1Monday);
    targetDate.setDate(isoWeek1Monday.getDate() + (week - 1) * 7);

    return monthNames[targetDate.getMonth()];
}

app.post("/api/upload", async (req, res) => {
  const { barangay, year, week, population, csv } = req.body;
  const month = getMonthFromISOWeek(parseInt(year), parseInt(week));

  const inserted = { records: false, population: false, rate: false, weather: false };

  try {
    // Check for duplicates
    const { data: existingSet, error: comboError } = await supabaseClient
      .from("records")
      .select("id")
      .eq("Barangay", barangay)
      .eq("Year", parseInt(year))
      .eq("Week", parseInt(week))
      .limit(1);

    if (comboError) throw new Error(comboError.message);
    if (existingSet && existingSet.length > 0) return res.json({ message: `Records for ${barangay}, ${year}, Week ${week} already exist.` });

    // CSV parsing
    const rows = csv.split("\n").map(r => r.trim()).filter(r => r);
    const headers = rows[0].split(",").map(h => h.trim());
    const requiredHeaders = ["Gender","Age_Group","Cases"];
    if (JSON.stringify(headers) !== JSON.stringify(requiredHeaders)) throw new Error("Invalid CSV headers.");

    const dataRows = rows.slice(1);
    const records = [];
    let totalCases = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const [Gender, Age_Group, Cases] = dataRows[i].split(",").map(c => c.trim());
      if (!allowedGenders.includes(Gender)) throw new Error(`Invalid Gender "${Gender}" on row ${i+2}`);
      if (!allowedAgeGroups.includes(Age_Group)) throw new Error(`Invalid Age Group "${Age_Group}" on row ${i+2}`);
      if (isNaN(parseInt(Cases))) throw new Error(`Cases must be a number on row ${i+2}`);

      const caseNum = parseInt(Cases);
      totalCases += caseNum;

      records.push({ Barangay: barangay, Year: parseInt(year), Month: month, Week: parseInt(week), Gender, Age_Group, Cases: caseNum });
    }

    // Insert records in batches of 10
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      const { error: insertError } = await supabaseClient.from("records").insert(batch);
      if (insertError) throw new Error(`Upload failed on batch ${i/10 + 1}: ` + insertError.message);
    }
    inserted.records = true;

    // Insert population
    const { error: popError } = await supabaseClient.from("population_records").insert([{
      Barangay: barangay, Year: parseInt(year), Month: month, Week: parseInt(week), Population: parseInt(population)
    }]);
    if (popError) throw new Error("Population record upload failed: " + popError.message);
    inserted.population = true;

    // Compute attack rate
    const attackRate = parseFloat(((totalCases / parseInt(population)) * 100).toFixed(6));
    const { error: insertRateError } = await supabaseClient.from("rate_and_classification").insert([{
      Barangay: barangay, Year: parseInt(year), Month: month, Week: parseInt(week), Cases: totalCases, attack_rate: attackRate
    }]);
    if (insertRateError) throw new Error(insertRateError.message);
    inserted.rate = true;

    // Update yearly risk classification
    const { data: yearRates, error: yearRateError } = await supabaseClient.from("rate_and_classification").select("id, attack_rate").eq("Year", parseInt(year));
    if (yearRateError) throw new Error(yearRateError.message);

    const rates = yearRates.map(r => r.attack_rate).filter(x => !isNaN(x));
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length;
    const std = Math.sqrt(variance);
    const classify = rate => rate > mean + 2 * std ? "High Risk" : rate > mean + std ? "Moderate Risk" : "Low Risk";

    for (const row of yearRates) {
      await supabaseClient.from("rate_and_classification").update({ risk_classification: classify(row.attack_rate) }).eq("id", row.id);
    }

    // Fetch weather data
    const { data: existingWeather } = await supabaseClient.from("weather_records").select("*").eq("Year", parseInt(year)).eq("Week", parseInt(week)).limit(1);
    if (!existingWeather || existingWeather.length === 0) {
      const lat = 14.06, lon = 121.32;
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const weekStart = new Date(simple);
      const diff = (dayOfWeek <= 4 ? dayOfWeek - 1 : dayOfWeek - 8);
      weekStart.setDate(simple.getDate() - diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = weekStart.toISOString().split("T")[0];
      const endStr = weekEnd.toISOString().split("T")[0];

      const apiDaily = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&start_date=${startStr}&end_date=${endStr}&timezone=Asia%2FManila`;
      const apiHourly = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=relative_humidity_2m&start_date=${startStr}&end_date=${endStr}&timezone=Asia%2FManila`;

      const [resDaily, resHourly] = await Promise.all([fetch(apiDaily), fetch(apiHourly)]);
      if (!resDaily.ok || !resHourly.ok) throw new Error("Weather API request failed");

      const daily = await resDaily.json();
      const hourly = await resHourly.json();
      const n = daily.daily.time.length;
      const avg_temp_max = daily.daily.temperature_2m_max.reduce((a, b) => a + b, 0) / n;
      const avg_temp_min = daily.daily.temperature_2m_min.reduce((a, b) => a + b, 0) / n;
      const avg_weekly_temp = parseFloat(((avg_temp_max + avg_temp_min) / 2).toFixed(2));
      const total_rainfall = parseFloat(daily.daily.precipitation_sum.reduce((a, b) => a + b, 0).toFixed(2));
      const avg_wind_speed = parseFloat((daily.daily.wind_speed_10m_max.reduce((a, b) => a + b, 0) / n).toFixed(2));
      const avg_wind_dir = parseFloat((daily.daily.wind_direction_10m_dominant.reduce((a, b) => a + b, 0) / n).toFixed(2));
      const avg_weekly_humidity = parseFloat((hourly.hourly.relative_humidity_2m.reduce((a, b) => a + b, 0) / hourly.hourly.relative_humidity_2m.length).toFixed(2));

      const { error: weatherInsertErr } = await supabaseClient.from("weather_records").insert([{
        Year: parseInt(year),
        Month: month,
        Week: parseInt(week),
        average_weekly_temperature: avg_weekly_temp,
        average_weekly_relative_humidity: avg_weekly_humidity,
        total_weekly_rainfall: total_rainfall,
        average_weekly_wind_speed: avg_wind_speed,
        average_weekly_wind_direction: avg_wind_dir
      }]);
      if (weatherInsertErr) throw new Error(weatherInsertErr.message);
      inserted.weather = true;
    }

    await fetch('/forecast');

    res.json({ message: "Uploaded successfully" });
  } catch (err) {
    console.error(err);

    // Rollback
    if (inserted.records) await supabaseClient.from("records").delete().eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
    if (inserted.population) await supabaseClient.from("population_records").delete().eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
    if (inserted.rate) await supabaseClient.from("rate_and_classification").delete().eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
    if (inserted.weather) await supabaseClient.from("weather_records").delete().eq("Year", year).eq("Week", week);

    res.json({ message: "Upload failed: " + err.message });
  }
});

app.post('/api/searchRecords', async (req, res) => {
  const { barangays, years, weeks } = req.body;
  try {
    const batchSize = 500;
    let offset = 0;
    let allData = [];

    while (true) {
      let query = supabaseClient
          .from('records')
          .select('*')
          .order('Barangay', { ascending: true })
          .order('Year', { ascending: true })
          .order('Week', { ascending: true })
          .order('Gender', { ascending: true })
          .order('Age_Group', { ascending: true })
          .range(offset, offset + batchSize - 1);

      if (!barangays.includes('All')) query = query.in('Barangay', barangays);
      if (!years.includes('All')) query = query.in('Year', years.map(y => parseInt(y)));
      if (!weeks.includes('All')) query = query.in('Week', weeks.map(w => parseInt(w)));

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;

      if (data.length < batchSize) break;
    }

    res.json({ data: allData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete records
app.post('/api/deleteRecords', async (req, res) => {
  const { barangays, years, weeks } = req.body;

  const filters = {};
  if (!barangays.includes("All")) filters.Barangay = barangays;
  if (!years.includes("All")) filters.Year = years;
  if (!weeks.includes("All")) filters.Week = weeks;

  try {
    const deleteWithFilters = async (table, colMap = {}) => {
      let query = supabaseClient.from(table).delete();
      for (const [key, value] of Object.entries(filters)) {
        const column = colMap[key] || key;
        if (Array.isArray(value)) query = query.in(column, value);
        else query = query.eq(column, value);
      }
      const { error } = await query;
      if (error) throw new Error(`Error deleting from ${table}: ${error.message}`);
    };

    await deleteWithFilters("overall_records");
    await deleteWithFilters("population_records");
    await deleteWithFilters("rate_and_classification");

    const batchSize = 100;
    let offset = 0;

    while (true) {
      let query = supabaseClient
        .from("records")
        .select("id")
        .range(offset, offset + batchSize - 1);

      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) query = query.in(key, value);
        else query = query.eq(key, value);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Error selecting records for deletion: ${error.message}`);
      if (!data || data.length === 0) break;

      const ids = data.map(r => r.id);
      const { error: delError } = await supabaseClient
        .from("records")
        .delete()
        .in("id", ids);
      if (delError) throw new Error(`Error deleting from records: ${delError.message}`);

      offset += batchSize;
      if (data.length < batchSize) break;
    }

    // Trigger forecast update
    await fetch('/forecast');

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================SYSTEM ADMINISTRATOR============================
app.get("/api/fetchContent", async (req, res) => {
  try {
    const { data: preventionContentData, error: preventionContentError } = await supabaseClient
      .from('prevention_content')
      .select('*')
      .order('id', { ascending: true });
    if (preventionContentError) throw preventionContentError;

    const { data: preventionHeaderData, error: preventionHeaderError } = await supabaseClient
      .from('site_content')
      .select('*')
      .order('id', { ascending: true });
    if (preventionHeaderError) throw preventionHeaderError;

    const { data: referencesData, error: referencesError } = await supabaseClient
      .from('references')
      .select('*')
      .order('id', { ascending: true });
    if (referencesError) throw referencesError;

    const { data: contactData, error: contactError } = await supabaseClient
      .from('contact_details')
      .select('*')
      .order('id', { ascending: true });
    if (contactError) throw contactError;

    res.json({
      preventionContentData,
      preventionHeaderData,
      referencesData,
      contactData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/updateContent', async (req, res) => {
  const { table, id, updateData } = req.body;

  if (!table || !id || !updateData) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const { error } = await supabaseClient
      .from(table)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deleteContent', async (req, res) => {
  const { table, id } = req.body;

  if (!table || !id) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const { error } = await supabaseClient
    .from(table)
    .delete()
    .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/addPrevention', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Both title and content are required.' });
  }

  try {
    const { error } = await supabaseClient
        .from('prevention_content')
        .insert([{ title, content }]);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Insert error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/addReference', async (req, res) => {
    const { title, href } = req.body;

    if (!title || !href) {
        return res.status(400).json({ error: 'Both title and link are required.' });
    }

    try {
        const { error } = await supabaseClient
            .from('references')
            .insert([{ title, href }]);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("Insert error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/addContact', async (req, res) => {
  const { office_name, address, phone, email, facebook_url } = req.body;

  if (!office_name || !address) {
    return res.status(400).json({ error: 'Office name and address are required.' });
  }

  try {
    const { error } = await supabaseClient
      .from('contact_details')
      .insert([{ office_name, address, phone, email, facebook_url }]);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Insert error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===========================ACCOUNTS ADMINISTRATOR===========================
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
function formatRole(role) {
  switch (role) {
    case 'superadmin':
      return 'Accounts Administrator';
    case 'healthcare':
      return 'Healthcare Staff';
    case 'admin':
      return 'System Administrator';
    default:
      return role;
  }
}
app.get('/api/logs', async (req, res) => {
  try {
    const { data, error } = await supabaseClient
      .from('login_logs')
      .select('id, email, first_name, last_name, role, logged_in_at')
      .order('logged_in_at', { ascending: false });

    if (error) throw error;

    const formattedLogs = data.map(user => ({
      ...user,
      role: formatRole(user.role),
      logged_in_at: formatToPHTime(user.logged_in_at)
    }));

    res.json(formattedLogs);

  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_enabled')
      .neq('role', 'superadmin');

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/users/:id/toggle', async (req, res) => {
  const userId = req.params.id;
  const { is_enabled } = req.body;

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ is_enabled })
      .eq('id', userId);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
