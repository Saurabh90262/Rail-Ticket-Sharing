// backend/importStations.js

const mongoose = require('mongoose');
require('dotenv').config();

// ─── Station Schema ───────────────────────────────────────────
const stationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  region: { type: String }
});

const Station = mongoose.model('Station', stationSchema);

// ─── Load JSON File ───────────────────────────────────────────
const rawStations = require('./stations.json');

// ─── Import Function ──────────────────────────────────────────
async function importStations() {
  try {
    console.log("🗑 Clearing old stations...");
    await Station.deleteMany();

    console.log("🔄 Processing stations...");

    const uniqueMap = new Map();

    rawStations.forEach(st => {
      if (!st.station_code) return;

      const code = st.station_code.trim();
      const name = st.station_name?.trim() || "";
      const region = st.region_code?.trim() || "";

      // Skip invalid entries
      if (!code || !name) return;

      // Remove duplicates (keep first occurrence)
      if (!uniqueMap.has(code)) {
        uniqueMap.set(code, {
          code,
          name,
          region
        });
      }
    });

    const formattedStations = Array.from(uniqueMap.values());

    console.log(`📦 Inserting ${formattedStations.length} unique stations...`);

    await Station.insertMany(formattedStations, { ordered: false });

    console.log(`✅ ${formattedStations.length} Unique Stations Imported Successfully`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Import Error:", err);
    process.exit(1);
  }
}

// ─── Connect to MongoDB then Run Import ───────────────────────
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000
})
.then(() => {
  console.log("✅ MongoDB Connected");
  importStations();
})
.catch(err => {
  console.error("❌ MongoDB Connection Failed:", err);
});