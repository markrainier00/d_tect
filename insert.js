const fs = require("fs");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");
const supabaseClient = createClient(
  "https://yxvgwmxlznpxqmmiofuy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5NTk3NiwiZXhwIjoyMDY3MjcxOTc2fQ.nOfRegHNEriDk2Sioa5f3Aaa_CwPEhyCnPyB9aV6k8Y"
);

// 2️⃣ Configuration
const TABLE_NAME = "rate_and_classification"; // your Supabase table
const CSV_PATH = "./barangay_combined.csv";        // path to your CSV file
const BATCH_SIZE = 100;              // best balance for 7-column data
const PAUSE_MS = 250;                 // short delay between batches (optional)

// Helper: small delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 3️⃣ Batch insert function
async function batchInsert(rows) {
  console.log(`Total rows: ${rows.length}`);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    console.log(`→ Inserting rows ${i + 1} to ${i + chunk.length}`);

    const { error } = await supabaseClient.from(TABLE_NAME).insert(chunk);

    if (error) {
      console.error("❌ Error inserting batch:", error.message);
      break;
    } else {
      console.log(`✅ Batch ${i / BATCH_SIZE + 1} inserted`);
    }

    await delay(PAUSE_MS);
  }

  console.log("✅ All rows uploaded successfully!");
}

// 4️⃣ Load CSV into memory
function loadCSV() {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => {
        console.log(`📦 Loaded ${data.length} rows from CSV`);
        resolve(data);
      })
      .on("error", reject);
  });
}

// 5️⃣ Main function
(async () => {
  const data = await loadCSV();
  await batchInsert(data);
})();
