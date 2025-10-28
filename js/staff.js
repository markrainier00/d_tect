const supabaseClient = supabase.createClient(
    "https://yxvgwmxlznpxqmmiofuy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5NTk3NiwiZXhwIjoyMDY3MjcxOTc2fQ.nOfRegHNEriDk2Sioa5f3Aaa_CwPEhyCnPyB9aV6k8Y"
);

document.addEventListener('DOMContentLoaded', () => {  
    verifyAuthToken();
    
    const spinnerText = document.getElementById("spinner-text");
    const spinner = document.getElementById("spinner");
    const loadingModal = document.getElementById('loading');
    const sidebar = document.querySelector('.sidebar');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mainContent = document.querySelector('.main-content');
    const navLinks = document.querySelectorAll('.sidebar ul li a');
    const contentSections = document.querySelectorAll('.content-section');
    const infoModal = document.getElementById('info-modal');
    const infoBtn = document.getElementById('info-btn');
    const resetBtn = document.getElementById('reset-btn');
    const forgotForm = document.getElementById('forgot-form');
    const forgotPassword = document.getElementById('forgot-password');
    const uploadModal = document.getElementById("upload-modal");
    const uploadBtn = document.getElementById("upload-btn");
    const showDataModal = document.getElementById("showData-Modal");
    const showDataBtn = document.getElementById("showData-btn");
    const barangaySelect = document.getElementById("barangay");
    
    // Verify authentication token
    async function verifyAuthToken() {
        try {
            const res = await fetch('/dtect/verify-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) {
                window.location.href = "/";
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            window.location.href = "/";
        }
    }

    // Sidebar Navigation
    if (sidebar && hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    // Highlighting Active Link on Sidebar
    if (mainContent) {
        mainContent.addEventListener('scroll', updateActiveNavLink);
    }
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });
    function handleNavLinkClick(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement && mainContent) {
            mainContent.scrollTo({ top: targetElement.offsetTop, behavior: 'smooth' });
        }
    }
    function updateActiveNavLink() {
        let currentSectionId = '';
        contentSections.forEach(section => {
            if (section.offsetTop <= mainContent.scrollTop + 150) { 
                currentSectionId = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
        });
    }

    // Open Modals
    if (infoBtn && infoModal) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            infoModal.style.display = 'flex';
        });
    }

    if (resetBtn && forgotPassword) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPassword.style.display = 'flex';
        });
    }

    if (uploadBtn && uploadModal) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            uploadModal.style.display = 'flex'
        })
    }
    
    if (showDataBtn && showDataModal) {
        showDataBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const barangaySelect = document.getElementById("filterBarangay");
            const weekSelect = document.getElementById("filterWeek");
            const yearSelect = document.getElementById("filterYear");

            // Barangays
            barangaySelect.innerHTML = `<option value="All">All</option>`;
            allowedBarangays.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b;
                opt.textContent = b;
                barangaySelect.appendChild(opt);
            });

            // Years
            const currentYear = new Date().getFullYear();
            yearSelect.innerHTML = `<option value="All">All</option>`;
            for (let y = 2021; y <= currentYear; y++) {
                const opt = document.createElement("option");
                opt.value = y;
                opt.textContent = y;
                yearSelect.appendChild(opt);
            }

            // Weeks
            weekSelect.innerHTML = `<option value="All">All</option>`;
            for (let w = 1; w <= 52; w++) {
                const opt = document.createElement("option");
                opt.value = w;
                opt.textContent = `Week ${w}`;
                weekSelect.appendChild(opt);
            }
            showDataModal.style.display = 'flex'
        })
    }
    // To Close Modals (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === infoModal || e.target === forgotPassword || e.target === uploadModal || e.target === showDataModal) {
            if (infoModal) infoModal.style.display = 'none';
            if (forgotPassword) forgotPassword.style.display = 'none';
            if (uploadModal) uploadModal.style.display = 'none';
            if (showDataModal) showDataModal.style.display = 'none';
            if (forgotForm) forgotForm.reset();
        }
    });
    
    // Reset password
    if (forgotForm && forgotPassword) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = forgotPassword.querySelector('#reset-email').value;

            if (!email) {
                alert('Please enter your email.');
                return;
            }

            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: 'http://localhost:3000/reset.html'
            });

            if (confirm("You need to log out to reset your password.")) {
                if (error) {
                    alert('Error: ' + error.message);
                } else {
                    alert('A password reset link has been sent to your email.');
                    forgotPassword.style.display = 'none';
                    forgotForm.reset();
                    window.location.href = '/logout';
                }
            }
        });
    }

    // Logout
    if (logout) {
        logout.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = '/logout';
            }
        });
    }
        
    const allowedBarangays = [
        "Atisan","Bautista","Concepcion","Del Remedio","Dolores",
        "I-A","I-B","II-A","II-A (Bagong Bayan)","II-B","II-C","II-D","II-E","II-F",
        "III-A","III-B","III-C","III-D","III-E","III-F",
        "IV-A","IV-B","IV-C",
        "San Antonio 1","San Antonio 2","San Bartolome","San Buenaventura","San Crispin",
        "San Cristobal","San Diego","San Francisco","San Gabriel","San Gregorio",
        "San Ignacio","San Isidro","San Joaquin","San Jose","San Juan","San Lorenzo",
        "San Lucas 1","San Lucas 2","San Marcos","San Mateo","San Miguel","San Nicolas",
        "San Pedro","San Rafael","San Roque","San Vicente","Santa Ana","Santa Catalina",
        "Santa Cruz","Santa Elena","Santa Felomina","Santa Isabel","Santa Maria",
        "Santa Maria Magdalena","Santa Monica","Santa Veronica","Santiago I","Santiago II",
        "Santisimo Rosario","Santo Angel","Santo Cristo","Santo Niño","Soledad",
        "V-A","V-B","V-C","V-D","VI-A","VI-B","VI-C (Bagong Pook)","VI-D","VI-E",
        "VII-A","VII-B","VII-C","VII-D","VII-E"
    ];
    const allowedMonths = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];
    const allowedGenders = ["Male", "Female"];
    const allowedAgeGroups = [
        "0 to 10","11 to 20","21 to 30","31 to 40",
        "41 to 50","51 to 60","61 and above"
    ];

    allowedBarangays.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        barangaySelect.appendChild(opt);
    });

    document.getElementById("save-btn").addEventListener("click", async () => {
        loadingModal.style.display = 'flex';
        spinner.style.display = "block";
        spinnerText.textContent = "Fetching data";

        const barangay = document.getElementById("barangay").value;
        const year = document.getElementById("year").value;
        const week = document.getElementById("week").value;
        const population = document.getElementById("population").value;
        const fileInput = document.getElementById("csvFile");

        if (!barangay || !year || !week) {
            spinner.style.display = "none";
            spinnerText.textContent = "Please fill out all details before uploading.";
            
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);       
            return;
        }

        if (!fileInput.files.length) {
            spinner.style.display = "none";
            spinnerText.textContent = "Please select a CSV file.";
            
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);       
            return;
        }
                
        if (!population || isNaN(population) || parseInt(population) <= 0) {
            spinner.style.display = "none";
            spinnerText.textContent = "Population must be a valid positive integer.";
            
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);       
            return;
        }

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

        const month = getMonthFromISOWeek(parseInt(year), parseInt(week));
        
        const inserted = {
            records: false,
            population: false,
            rate: false,
            weather: false
        };

        spinnerText.textContent = "Processing data";
        try {
            // Check for duplicates
            const { data: existingSet, error: comboError } = await supabaseClient
                .from("records")
                .select("id")
                .eq("Barangay", barangay)
                .eq("Year", parseInt(year))
                .eq("Week", parseInt(week))
                .limit(1);

            if (comboError) {
                spinner.style.display = "none";
                spinnerText.textContent = "Supabase error: " + comboError.message;
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            } 

            if (existingSet && existingSet.length > 0) {
                spinnerText.textContent = `Records for ${barangay}, ${year}, Week ${week} already exist.`;
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            }

            const text = await fileInput.files[0].text();
            const rows = text.split("\n").map(r => r.trim()).filter(r => r);
            const headers = rows[0].split(",").map(h => h.trim());
            const requiredHeaders = ["Gender","Age_Group","Cases"];
                
            if (JSON.stringify(headers) !== JSON.stringify(requiredHeaders)) {
                spinner.style.display = "none";
                spinnerText.textContent = "Invalid CSV headers. Must be exactly: " + requiredHeaders.join(", ");
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            }

            const dataRows = rows.slice(1);
            const records = [];
            let totalCases = 0;

            spinnerText.textContent = "Uploading data";
            for (let i = 0; i < dataRows.length; i++) {
                const cols = dataRows[i].split(",").map(c => c.trim());
                const [Gender, Age_Group, Cases] = cols;

                if (!allowedGenders.includes(Gender)) {
                    spinner.style.display = "none";
                    spinnerText.textContent = `Invalid Gender "${Gender}" on row ${i+2}`;
                    
                    setTimeout(() => {
                        loadingModal.style.display = "none";
                        uploadModal.style.display = "none";
                        spinnerText.textContent = "";
                    }, 3000);       
                    return;
                }
                if (!allowedAgeGroups.includes(Age_Group)) {
                    spinner.style.display = "none";
                    spinnerText.textContent = `Invalid Age Group "${Age_Group}" on row ${i+2}`;
                    
                    setTimeout(() => {
                        loadingModal.style.display = "none";
                        uploadModal.style.display = "none";
                        spinnerText.textContent = "";
                    }, 3000);       
                    return;
                }
                if (isNaN(parseInt(Cases))) {
                    spinner.style.display = "none";
                    spinnerText.textContent = `Cases must be a number on row ${i+2}`;
                    
                    setTimeout(() => {
                        loadingModal.style.display = "none";
                        uploadModal.style.display = "none";
                        spinnerText.textContent = "";
                    }, 3000);       
                    return;
                }

                const caseNum = parseInt(Cases);
                totalCases += caseNum;
                
                records.push({
                    Barangay: barangay,
                    Year: parseInt(year),
                    Month: month,
                    Week: parseInt(week),
                    Gender,
                    Age_Group,
                    Cases: parseInt(Cases)
                });
            }

            for (let i = 0; i < records.length; i += 10) {
                const batch = records.slice(i, i + 10);
                const { error: insertError } = await supabaseClient.from("records").insert(batch);
                if (insertError) {
                    spinner.style.display = "none";
                    spinnerText.textContent = `Upload failed on batch ${i/10 + 1}: ` + insertError.message;
                    
                    setTimeout(() => {
                        loadingModal.style.display = "none";
                        uploadModal.style.display = "none";
                        spinnerText.textContent = "";
                    }, 3000);       
                    return;
                }
            }
            inserted.records = true;

            const { error: popError } = await supabaseClient
                .from("population_records")
                .insert([{
                    Barangay: barangay,
                    Year: parseInt(year),
                    Month: month,
                    Week: parseInt(week),
                    Population: parseInt(population)
                }]);

            if (popError) {
                spinner.style.display = "none";
                spinnerText.textContent = "Population record upload failed: " + popError.message;
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            }
            inserted.population = true;
            
            spinnerText.textContent = "Computing attack rate and classifying risk";
            const attackRate = parseFloat(((totalCases / parseInt(population)) * 100).toFixed(6));

            const { error: insertRateError } = await supabaseClient
                .from("rate_and_classification")
                .insert([{
                    Barangay: barangay,
                    Year: parseInt(year),
                    Month: month,
                    Week: parseInt(week),
                    Cases: totalCases,
                    attack_rate: attackRate
                }])

            if (insertRateError) {
                spinner.style.display = "none";
                spinnerText.textContent = "Failed to insert rate and classification record: " + insertRateError.message;
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            }
            inserted.rate = true;

            const { data: yearRates, error: yearRateError } = await supabaseClient
                .from("rate_and_classification")
                .select("id, attack_rate")
                .eq("Year", parseInt(year));

            if (yearRateError) {
                spinner.style.display = "none";
                spinnerText.textContent = "Failed to fetch yearly attack rates: " + yearRateError.message;
                
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = "";
                }, 3000);       
                return;
            }

            const rates = yearRates.map(r => r.attack_rate).filter(x => !isNaN(x));
            const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
            const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length;
            const std = Math.sqrt(variance);

            const classify = (rate) => {
                if (rate > mean + 2 * std) return "High Risk";
                if (rate > mean + std) return "Moderate Risk";
                return "Low Risk";
            };
                
            // Update all rows for the current year
            const updates = yearRates.map(r => ({
                id: r.id,
                risk_classification: classify(r.attack_rate)
            }));

            for (const row of updates) {
                await supabaseClient
                .from("rate_and_classification")
                .update({ risk_classification: row.risk_classification })
                .eq("id", row.id);
            }

            spinnerText.textContent = "Getting weather data";
            const { data: existingWeather, error: weatherErr } = await supabaseClient
                .from("weather_records")
                .select("*")
                .eq("Year", parseInt(year))
                .eq("Week", parseInt(week))
                .limit(1);
            
            if ((!existingWeather || existingWeather.length === 0) && !weatherErr) {
                const lat = 14.06;
                const lon = 121.32;
                        
                // Get start and end dates
                const y = parseInt(year);
                const w = parseInt(week);
                const simple = new Date(y, 0, 1 + (w - 1) * 7);
                const dayOfWeek = simple.getDay();
                const weekStart = new Date(simple);
                const diff = (dayOfWeek <= 4 ? dayOfWeek - 1 : dayOfWeek - 8);
                weekStart.setDate(simple.getDate() - diff);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const startStr = weekStart.toISOString().split("T")[0];
                const endStr = weekEnd.toISOString().split("T")[0]

                // Daily data for temp, rain,and wind
                const apiDaily = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&start_date=${startStr}&end_date=${endStr}&timezone=Asia%2FManila`;

                // Hourly data for humidity
                const apiHourly = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=relative_humidity_2m&start_date=${startStr}&end_date=${endStr}&timezone=Asia%2FManila`;
                
                const [resDaily, resHourly] = await Promise.all([fetch(apiDaily), fetch(apiHourly)]);

                if (!resDaily.ok || !resHourly.ok) 
                    throw new Error("Weather API request failed")

                const daily = await resDaily.json();
                const hourly = await resHourly.json();
                
                const n = daily.daily.time.length;
                const avg_temp_max = daily.daily.temperature_2m_max.reduce((a, b) => a + b, 0) / n;
                const avg_temp_min = daily.daily.temperature_2m_min.reduce((a, b) => a + b, 0) / n;
                const avg_weekly_temp = parseFloat(((avg_temp_max + avg_temp_min) / 2).toFixed(2));
                    
                const total_rainfall = parseFloat(daily.daily.precipitation_sum.reduce((a, b) => a + b, 0).toFixed(2));
                const avg_wind_speed = parseFloat((daily.daily.wind_speed_10m_max.reduce((a, b) => a + b, 0) / n).toFixed(2));
                const avg_wind_dir = parseFloat((daily.daily.wind_direction_10m_dominant.reduce((a, b) => a + b, 0) / n).toFixed(2));

                const h = hourly.hourly.relative_humidity_2m;
                const avg_weekly_humidity = parseFloat((h.reduce((a, b) => a + b, 0) / h.length).toFixed(2));
                    
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
                
                if (weatherInsertErr) throw new Error("Weather record insert failed: " + weatherInsertErr.message);
                inserted.weather = true;
            }
            
            spinnerText.textContent = "Updating forecast";
            await fetch('http://localhost:3000/forecast');
            spinnerText.textContent = "Uploaded successfully";
            
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);       
        } catch (err) {
            console.error("Upload failed:", err.message);

            if (inserted.records) {
                await supabaseClient.from("records").delete()
                    .eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
                await supabaseClient.from("overall_records").delete()
                    .eq("Barangay", barangay).eq("Year", year).eq("Week", week);
            }
            if (inserted.population) {
                await supabaseClient.from("population_records").delete()
                    .eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
            }
            if (inserted.rate) {
                await supabaseClient.from("rate_and_classification").delete()
                    .eq("Barangay", barangay).eq("Year", year).eq("Month", month).eq("Week", week);
            }
            if (inserted.weather) {
                await supabaseClient.from("weather_records").delete()
                    .eq("Year", year).eq("Week", week);
            }

            spinnerText.textContent = "Upload failed";
            
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);       
        }
    });

    // Search data
    document.getElementById("searchDataBtn").addEventListener("click", async () => {
        const barangay = document.getElementById("filterBarangay").value;
        const year = document.getElementById("filterYear").value;
        const week = document.getElementById("filterWeek").value;
        const dataTableContainer = document.getElementById("dataTable-container");

        
        dataTableContainer.style.display = "block";
        const tbody = document.getElementById("dataTableBody");
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    <div class="search-spinner"></div>
                    <p>Loading data...</p>
                </td>
            </tr>
        `;
        
        const batchSize = 100;
        let offset = 0;
        let allData = [];
        
        try {
            while (true) {
                let query = supabaseClient
                    .from("records")
                    .select("*")
                    .order("Barangay", { ascending: true})
                    .order("Year", { ascending: true })
                    .order("Week", { ascending: true })
                    .order("Gender", { ascending: true })
                    .order("Age_Group", { ascending: true })
                    .range(offset, offset + batchSize - 1);

                if (barangay !== "All") query = query.eq("Barangay", barangay);
                if (year !== "All") query = query.eq("Year", parseInt(year));
                if (week !== "All") query = query.eq("Week", parseInt(week));

                const { data, error } = await query;
                if (error) throw error;
 
                if (!data || data.length === 0) break;

                allData = allData.concat(data);
                offset += batchSize;

                if (data.length < batchSize) break;

            }
            displayDataTable(allData);
        } catch (err) {
            alert("Error fetching data: " + err.message);
            console.error(err);
        }
    });
    
    // Show data
    function displayDataTable(data) {
        const tbody = document.getElementById("dataTableBody");
        tbody.innerHTML = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">No data found.</td></tr>`;
            document.getElementById("deleteDataBtn").disabled = true;
            return;
        }

        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${row.Barangay}</td>
            <td>${row.Year}</td>
            <td>${row.Month}</td>
            <td>${row.Week}</td>
            <td>${row.Gender}</td>
            <td>${row.Age_Group}</td>
            <td>${row.Cases}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("deleteDataBtn").disabled = false;
    }

    // Delete data
    document.getElementById("deleteDataBtn").addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete these records? This cannot be undone.")) return;

        const barangay = document.getElementById("filterBarangay").value;
        const year = document.getElementById("filterYear").value;
        const week = document.getElementById("filterWeek").value;

        try {
            const filters = {};
            if (barangay !== "All") filters.Barangay = barangay;
            if (year !== "All") filters.Year = parseInt(year);
            if (week !== "All") filters.Week = parseInt(week);

            const deleteWithFilters = async (table, colMap = {}) => {
                let query = supabaseClient.from(table).delete();
                for (const [key, value] of Object.entries(filters)) {
                    const column = colMap[key] || key;
                    query = query.eq(column, value);
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
                    query = query.eq(key, value);
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
            
            const { data: userData } = await supabaseClient.auth.getUser();
            const user = userData?.user || {};

            await supabaseClient.from("actions").insert([{
                email: user.email || "Unknown",
                first_name: user.user_metadata?.first_name || "N/A",
                last_name: user.user_metadata?.last_name || "N/A",
                role: user.user_metadata?.role || "N/A",
                action: "Deleted Records",
                data: JSON.stringify({ barangay, year, week })
            }]);

            alert("Records deleted successfully.");
            document.getElementById("dataTableBody").innerHTML = "";
            document.getElementById("deleteDataBtn").disabled = true;
        } catch (err) {
            alert("Error deleting records: " + err.message);
            console.error(err);
        }
    });
});