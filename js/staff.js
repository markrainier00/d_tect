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

document.addEventListener('DOMContentLoaded', () => {  
    verifyAuthToken();
    const spinnerText = document.getElementById("spinner-text");
    const spinner = document.getElementById("spinner");
    const loadingModal = document.getElementById('loading');
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
            const barangayContainer = document.getElementById("filterBarangay");
            const weekContainer = document.getElementById("filterWeek");
            const yearContainer = document.getElementById("filterYear");

            barangayContainer.innerHTML = "";
            yearContainer.innerHTML = "";
            weekContainer.innerHTML = "";

                    
            const allBarangayOption = document.createElement("div");
            allBarangayOption.innerHTML = `
                <label><input type="checkbox" value="All" checked> All</label>
            `;
            barangayContainer.appendChild(allBarangayOption);

            allowedBarangays.forEach((b) => {
                const div = document.createElement("div");
                div.innerHTML = `<label><input type="checkbox" value="${b}" checked> ${b}</label>`;
                barangayContainer.appendChild(div);
            });

            const currentYear = new Date().getFullYear();
            const allYearOption = document.createElement("div");
            allYearOption.innerHTML = `
                <label><input type="checkbox" value="All" checked> All</label>
            `;
            yearContainer.appendChild(allYearOption);

            for (let y = 2021; y <= currentYear; y++) {
                const div = document.createElement("div");
                div.innerHTML = `<label><input type="checkbox" value="${y}" checked> ${y}</label>`;
                yearContainer.appendChild(div);
            }

            const allWeekOption = document.createElement("div");
            allWeekOption.innerHTML = `
                <label><input type="checkbox" value="All" checked> All</label>
            `;
            weekContainer.appendChild(allWeekOption);

            for (let w = 1; w <= 52; w++) {
                const div = document.createElement("div");
                div.innerHTML = `<label><input type="checkbox" value="${w}" checked> Week ${w}</label>`;
                weekContainer.appendChild(div);
            }
            ["filterBarangay", "filterYear", "filterWeek"].forEach(id => {
                const container = document.getElementById(id);
                const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                const allCheckbox = checkboxes[0];

                allCheckbox.addEventListener('change', () => {
                    checkboxes.forEach(cb => cb.checked = allCheckbox.checked);
                });

                checkboxes.forEach(cb => {
                    if (cb.value !== "All") {
                        cb.addEventListener('change', () => {
                            if (!cb.checked) {
                                allCheckbox.checked = false;
                            } else {
                                const allChecked = Array.from(checkboxes).slice(1).every(c => c.checked);
                                allCheckbox.checked = allChecked;
                            }
                        });
                    }
                });
            });

            showDataModal.style.display = 'flex'
        })
    }
    // To Close Modals (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === infoModal || e.target === forgotPassword || e.target === uploadModal || e.target === showDataModal) {
            if (infoModal) infoModal.style.display = 'none';
            if (forgotPassword) forgotPassword.style.display = 'none';
            if (forgotForm) forgotForm.reset();
            if (uploadModal) uploadModal.style.display = 'none';
            if (showDataModal) showDataModal.style.display = 'none';
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
            
            try {
                const res = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Failed to reset password');

                if (confirm("You need to log out to reset your password.")) {
                    alert(data.message);
                    forgotPassword.style.display = 'none';
                    forgotForm.reset();
                    window.location.href = '/logout';
                }

            } catch (err) {
                alert('Error: ' + err.message);
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

    allowedBarangays.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        barangaySelect.appendChild(opt);
    });

    // Upload data
    document.getElementById("save-btn").addEventListener("click", async () => {
        loadingModal.style.display = 'flex';
        spinner.style.display = "block";
        spinnerText.textContent = "Fetching data";

        const barangay = document.getElementById("barangay").value;
        const year = document.getElementById("year").value;
        const week = document.getElementById("week").value;
        const population = document.getElementById("population").value;
        const fileInput = document.getElementById("csvFile");

        // Basic validations
        if (!barangay || !year || !week) return showError("Please fill out all details before uploading.");
        if (!fileInput.files.length) return showError("Please select a CSV file.");
        if (!population || isNaN(population) || parseInt(population) <= 0) return showError("Population must be a valid positive integer.");

        const text = await fileInput.files[0].text();

        // Send data to backend
        try {
            spinnerText.textContent = "Processing data...";
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ barangay, year, week, population, csv: text })
            });
            const result = await res.json();
            spinner.style.display = "none";
            spinnerText.textContent = result.message;
        } catch (err) {
            spinnerText.textContent = "Upload failed";
            console.error(err);
        } finally {
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);
        }

        function showError(msg) {
            spinner.style.display = "none";
            spinnerText.textContent = msg;
            setTimeout(() => {
                loadingModal.style.display = "none";
                uploadModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);
        }
    });

    let lastFetchedData = [];

    // Get checked values
    const getCheckedValues = (containerId) => {
        const checked = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
            .map(cb => cb.value);
        return checked.includes("All") || checked.length === 0 ? ["All"] : checked;
    };

    // Search data
    document.getElementById("searchDataBtn").addEventListener("click", async () => {
        loadingModal.style.display = 'flex';
        spinner.style.display = "block";
        spinnerText.textContent = "Fetching data";

        const filtersId = ["filterBarangay", "filterYear", "filterWeek"];
        for (const id of filtersId) {
            const container = document.getElementById(id);
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            if (!Array.from(checkboxes).some(cb => cb.checked)) {
                spinner.style.display = "none";
                spinnerText.textContent =`Please select at least one option in ${id.replace("filter", "")} before searching.`;
                setTimeout(() => {
                    loadingModal.style.display = "none";
                    uploadModal.style.display = "none";
                    spinnerText.textContent = ""; 
                }, 3000);
                return;
            }
        }

        const barangays = getCheckedValues("filterBarangay");
        const years = getCheckedValues("filterYear");
        const weeks = getCheckedValues("filterWeek");

        const dataTableContainer = document.getElementById("dataTable-container");
        const tbody = document.getElementById("dataTableBody");

        dataTableContainer.style.display = "block";
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    <div class="search-spinner"></div>
                    <p>Loading data...</p>
                </td>
            </tr>
        `;

        try {
            const response = await fetch('/api/searchRecords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barangays, years, weeks })
            });

            const result = await response.json();
            if (response.ok) {
                lastFetchedData = result.data || [];
                tbody.innerHTML = "";

                lastFetchedData.forEach(row => {
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

                document.getElementById("deleteDataBtn").disabled = lastFetchedData.length === 0;
                document.getElementById("downloadCsvBtn").disabled = lastFetchedData.length === 0;
            } else {
                throw new Error(result.error || "Unknown error");
            }
        } catch (err) {
            alert("Error fetching data: " + err.message);
            console.error(err);
        } finally {
            loadingModal.style.display = "none";
            spinnerText.textContent = "";
        }
    });

    // Download data
    document.getElementById("downloadCsvBtn").addEventListener("click", () => {
        if (!lastFetchedData.length) {
            alert("No data available to download. Please search first.");
            return;
        }

        const timestamp = new Date().toISOString().split("T")[0];
        const safeName = `records_${timestamp}.csv`;

        const headers = Object.keys(lastFetchedData[0]);
        const csvRows = [headers.join(",")];

        for (const row of lastFetchedData) {
            const values = headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`);
            csvRows.push(values.join(","));
        }

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = safeName;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Delete data
    document.getElementById("deleteDataBtn").addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete these records? This cannot be undone.")) return;

        loadingModal.style.display = "flex";
        spinnerText.textContent = "Deleting data";

        const barangays = Array.from(document.querySelectorAll(`#filterBarangay input:checked`)).map(cb => cb.value);
        const years = Array.from(document.querySelectorAll(`#filterYear input:checked`)).map(cb => cb.value);
        const weeks = Array.from(document.querySelectorAll(`#filterWeek input:checked`)).map(cb => cb.value);

        try {
            const response = await fetch('/api/deleteRecords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barangays, years, weeks })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unknown error");

            spinnerText.textContent = "Records deleted successfully.";
            spinner.style.display = "none";

            setTimeout(() => {
                loadingModal.style.display = "none";
                spinnerText.textContent = "";
            }, 3000);

            document.getElementById("dataTableBody").innerHTML = "";
            document.getElementById("deleteDataBtn").disabled = true;
            document.getElementById("downloadCsvBtn").disabled = true;
            lastFetchedData = [];
        } catch (err) {
            alert("Error deleting records: " + err.message);
            console.error(err);
            loadingModal.style.display = "none";
        }
    });
});