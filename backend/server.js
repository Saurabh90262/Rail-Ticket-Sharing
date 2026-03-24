const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const fs = require("fs"); // 👈 ADD THIS LINE TO READ THE GEOJSON
const crypto = require("crypto"); // 👈 NEW
require("dotenv").config();


const app = express();
app.use(cors());
app.use(express.json());

/* ─────────────────────────────────────────
   GEOJSON MEMORY LOADER & HAVERSINE MATH
   (Does not touch MongoDB)
───────────────────────────────────────── */
const stationGeoData = {};

try {
  // 1. Read and parse the local GeoJSON file
  const rawData = fs.readFileSync('./india_railway_stations.geojson', 'utf8');
  const geoJson = JSON.parse(rawData);
  
  // 2. Convert it into a clean dictionary for instant lookups
  geoJson.features.forEach(feature => {
    const props = feature.properties;
    if (props && props.code && props.lat && props.long) { 
      stationGeoData[props.code.trim().toUpperCase()] = {
        name: props.name,
        lat: parseFloat(props.lat),
        lng: parseFloat(props.long)
      };
    }
  });
  console.log(`🗺️ Loaded ${Object.keys(stationGeoData).length} stations from GeoJSON.`);
} catch (err) {
  console.warn("⚠️ Could not load india_railway_stations.geojson", err.message);
}

// 3. The Math to calculate kilometers between coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

// 4. Get all station codes within 50km
function getNearbyStationCodes(targetCode, radiusKm = 50) {
  if (!targetCode) return [];
  const target = stationGeoData[targetCode.toUpperCase()];
  if (!target) return []; 

  const nearbyCodes = [];
  for (const [code, coords] of Object.entries(stationGeoData)) {
    if (code !== targetCode.toUpperCase()) {
      const distance = getDistanceFromLatLonInKm(target.lat, target.lng, coords.lat, coords.lng);
      if (distance <= radiusKm) {
        nearbyCodes.push(code);
      }
    }
  }
  return nearbyCodes;
}

/* ─────────────────────────────────────────
   MongoDB Connection
───────────────────────────────────────── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ─────────────────────────────────────────
   User Schema
───────────────────────────────────────── */
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

/* ─────────────────────────────────────────
   Ticket Schema
───────────────────────────────────────── */
const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    boardingStation: { type: String, required: true },
    destinationStation: { type: String, required: true },

    dateOfJourney: { type: String, required: true },
    trainName: { type: String, required: true },
    trainNumber: { type: String, required: true },
    departureTime: { type: String, required: true },

    classType: { type: String, required: true },
    ticketStatus: { type: String, required: true },

    racOrWaitingNumber: { type: String, default: "" },

    numberOfPassengers: { type: Number, required: true },

    passengers: [
      {
        gender: String,
        age: Number,
      },
    ],

    price: { type: Number, required: true },
  },
  { timestamps: true },
);

ticketSchema.index({ boardingStation: 1 });
ticketSchema.index({ destinationStation: 1 });
ticketSchema.index({ dateOfJourney: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);
/* ─────────────────────────────────────────
   AUTO DELETE OLD TICKETS (Fixed for Free Hosting)
───────────────────────────────────────── */
const cleanupOldTickets = async () => {
  try {
    // 1. Get today's date in YYYY-MM-DD format (Adjusted for Indian Standard Time)
    const today = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const result = await Ticket.deleteMany({
      dateOfJourney: { $lt: today },
    });

    if (result.deletedCount > 0) {
      console.log(
        `🧹 Auto-Cleanup: Deleted ${result.deletedCount} old tickets.`,
      );
    }
  } catch (err) {
    console.error("Auto delete error:", err);
  }
};

// 👉 Fix 1: Run the cleanup immediately every time the server starts/wakes up
cleanupOldTickets();

// 👉 Fix 2: Schedule it to try running every 4 hours instead of just at 3 AM
cron.schedule("0 */4 * * *", cleanupOldTickets);

/* ─────────────────────────────────────────
   Station Schema
───────────────────────────────────────── */

const stationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: String,

  searchText: {
    type: String,
    index: true,
  },
});

stationSchema.index({ name: 1 });
stationSchema.index({ code: 1 });

/* 🔹 Create searchable text automatically */
stationSchema.pre("save", function (next) {
  this.searchText = (this.code + " " + this.name).toLowerCase();

  next();
});

const Station = mongoose.model("Station", stationSchema);

/* ─────────────────────────────────────────
   JWT Middleware
───────────────────────────────────────── */
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ─────────────────────────────────────────
   OTP & EMAIL SETUP
───────────────────────────────────────── */

const generateOTPToken = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(otp)
    .digest("hex");
  // Token valid for 5 mins
  const token = jwt.sign({ email, hash }, process.env.JWT_SECRET, {
    expiresIn: "5m",
  });
  return { otp, token };
};

const verifyOTP = (otp, token, email) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = crypto
      .createHmac("sha256", process.env.OTP_SECRET)
      .update(otp)
      .digest("hex");
    return decoded.email === email && decoded.hash === hash;
  } catch (err) {
    return false;
  }
};

/* ─────────────────────────────────────────
   AUTH ROUTES
───────────────────────────────────────── */

// 1. Request OTP (For Register or Forgot Password)
app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const { email, type } = req.body;

    // 🚨 BACKEND VALIDATION
    if (!email) return res.status(400).json({ message: "Email is required" });

    const userExists = await User.findOne({ email });
    if (type === "register" && userExists)
      return res
        .status(400)
        .json({ message: "User already exists. Please login." });
    if (type === "forgot" && !userExists)
      return res.status(400).json({ message: "User not found." });

    const { otp, token } = generateOTPToken(email);

    const emailResponse = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        to: email,
        subject: `${otp} is your TrainExpert Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #0d0f1a;">TrainExpert Verification</h2>
            <p style="color: #6b7080;">Use the code below to verify your email. Valid for 5 minutes.</p>
            <div style="background: #f0f2f8; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #e8334a; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="font-size: 0.8rem; color: #999;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error("Failed to trigger Google Script Mailer");
    }

    res.json({ token, message: "OTP sent to email" });
  } catch (err) {
    console.error("🚨 OTP Email Error:", err);
    res.status(500).json({ message: "Error sending email" });
  }
});

// 2. Verify OTP and Register
app.post("/api/auth/register-verify", async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, otp, otpToken } =
      req.body;

    // 🚨 BACKEND VALIDATION
    if (
      !firstName ||
      !lastName ||
      !email ||
      !mobile ||
      !password ||
      !otp ||
      !otpToken
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    if (!verifyOTP(otp, otpToken, email)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password: hashed,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: { id: user._id, firstName, lastName, email, mobile },
    });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(400)
        .json({ message: "Email or Mobile already exists" });
    res.status(500).json({ message: err.message });
  }
});

// 3. Verify OTP and Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, password, otp, otpToken } = req.body;

    // 🚨 BACKEND VALIDATION
    if (!email || !password || !otp || !otpToken) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    if (!verifyOTP(otp, otpToken, email)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate({ email }, { password: hashed });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// 4. Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🚨 BACKEND VALIDATION
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   UPDATE PROFILE
───────────────────────────────────────── */

app.put("/api/users/update", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, mobile } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, mobile },
      { new: true, runValidators: true },
    );

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
      },
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Mobile number already in use" });

    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   STATION AUTOSUGGEST (SMART SEARCH)
───────────────────────────────────────── */

app.get("/api/stations", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 1) return res.json([]);

    const q = query.toLowerCase().trim();

    const stations = await Station.aggregate([
      {
        $addFields: {
          codeMatch: {
            $cond: [
              { $regexMatch: { input: { $toLower: "$code" }, regex: "^" + q } },
              1,
              0,
            ],
          },

          nameStartMatch: {
            $cond: [
              { $regexMatch: { input: { $toLower: "$name" }, regex: "^" + q } },
              1,
              0,
            ],
          },
        },
      },

      {
        $match: {
          searchText: { $regex: q },
        },
      },

      {
        $sort: {
          codeMatch: -1,
          nameStartMatch: -1,
          name: 1,
        },
      },

      {
        $limit: 10,
      },
    ]);

    res.json(stations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   CREATE TICKET
───────────────────────────────────────── */

app.post("/api/tickets", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.create({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   SEARCH TICKETS (SMART GROUPED RESULTS)
───────────────────────────────────────── */

app.get("/api/tickets", async (req, res) => {
  try {
    const { boarding, destination, date } = req.query;

    const boardingCode = boarding?.split("-")[0]?.trim();
    const destinationCode = destination?.split("-")[0]?.trim();

    // 👇 NEW: Always filter out past dates so they NEVER show up on the frontend
    const today = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const baseQuery = { dateOfJourney: { $gte: today } };

    if (boardingCode)
      baseQuery.boardingStation = { $regex: boardingCode, $options: "i" };

    if (destinationCode)
      baseQuery.destinationStation = { $regex: destinationCode, $options: "i" };

    /* ───────── Exact Date Matches ───────── */

    let exactMatches = [];

    if (date) {
      exactMatches = await Ticket.aggregate([
        {
          $match: {
            ...baseQuery,
            dateOfJourney: date,
          },
        },
        {
          $addFields: {
            statusPriority: {
              $switch: {
                branches: [
                  { case: { $eq: ["$ticketStatus", "Confirmed"] }, then: 1 },
                  { case: { $eq: ["$ticketStatus", "RAC"] }, then: 2 },
                  { case: { $eq: ["$ticketStatus", "Waiting List"] }, then: 3 },
                ],
                default: 4,
              },
            },
          },
        },
        {
          $sort: {
            statusPriority: 1,
            createdAt: -1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
          },
        },
        {
          $unwind: "$userId",
        },
      ]);
    }

    /* ───────── Other Available Options ───────── */

    const otherOptions = await Ticket.aggregate([
      {
        $match: {
          ...baseQuery,
          ...(date ? { dateOfJourney: { $ne: date } } : {}),
        },
      },
      {
        $addFields: {
          statusPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$ticketStatus", "Confirmed"] }, then: 1 },
                { case: { $eq: ["$ticketStatus", "RAC"] }, then: 2 },
                { case: { $eq: ["$ticketStatus", "Waiting List"] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      {
        $sort: {
          statusPriority: 1,
          dateOfJourney: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $unwind: "$userId",
      },
    ]);

    /* ───────── 3. Nearby Station Matches (100km Radius) ───────── */
    let nearbyOptions = [];
    
    // 1. Get nearby codes (100km radius)
    const nearbyBoardingCodes = getNearbyStationCodes(boardingCode, 100); 
    const nearbyDestCodes = getNearbyStationCodes(destinationCode, 100);

    // 2. Create the expanded arrays (Exact Searched Code + Nearby Codes)
    const expandedBoarding = boardingCode ? [boardingCode, ...nearbyBoardingCodes] : nearbyBoardingCodes;
    const expandedDest = destinationCode ? [destinationCode, ...nearbyDestCodes] : nearbyDestCodes;

    // 3. Helper to escape weird characters in station codes so Regex doesn't crash
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (expandedBoarding.length > 0 && expandedDest.length > 0) {
      
      // 4. Create an array of clean, safe RegExp objects for MongoDB
      const boardingRegexArray = expandedBoarding.map(code => new RegExp(`^${escapeRegex(code)}`, "i"));
      const destRegexArray = expandedDest.map(code => new RegExp(`^${escapeRegex(code)}`, "i"));

      const nearbyQuery = { 
        dateOfJourney: { $gte: today },
        boardingStation: { $in: boardingRegexArray }, // 👈 Using $in instead of a massive string!
        destinationStation: { $in: destRegexArray }
      };

      // 5. Exclude the EXACT route so we don't show duplicate tickets in the "Nearby" section
      if (boardingCode && destinationCode) {
        nearbyQuery.$nor = [
          {
            boardingStation: { $regex: `^${escapeRegex(boardingCode)}`, $options: "i" },
            destinationStation: { $regex: `^${escapeRegex(destinationCode)}`, $options: "i" }
          }
        ];
      }

      nearbyOptions = await Ticket.aggregate([
        { $match: nearbyQuery },
        {
          $addFields: {
            statusPriority: {
              $switch: {
                branches: [
                  { case: { $eq: ["$ticketStatus", "Confirmed"] }, then: 1 },
                  { case: { $eq: ["$ticketStatus", "RAC"] }, then: 2 },
                  { case: { $eq: ["$ticketStatus", "Waiting List"] }, then: 3 },
                ],
                default: 4,
              },
            },
          },
        },
        { $sort: { statusPriority: 1, dateOfJourney: 1 } },
        { $limit: 15 }, // Cap at 15 so we don't overwhelm the UI
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userId" } },
        { $unwind: "$userId" },
      ]);
    }

    // Send all three arrays back to React!
    res.json({
      exactMatches,
      otherOptions,
      nearbyOptions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   USER TICKETS
───────────────────────────────────────── */

app.get("/api/tickets/user/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ message: "Not authorized" });

    const tickets = await Ticket.find({ userId: req.params.id }).sort({
      createdAt: -1,
    });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   UPDATE TICKET
───────────────────────────────────────── */
app.put("/api/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Verify the user owns this ticket
    if (ticket.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true },
    );

    res.json(updatedTicket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   DELETE TICKET
───────────────────────────────────────── */

app.delete("/api/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await ticket.deleteOne();

    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────
   SERVER WAKE-UP PING ROUTE
───────────────────────────────────────── */
app.get("/api/ping", (req, res) => {
  res.status(200).json({ message: "Server is awake!" });
});

/* ─────────────────────────────────────────
   KEEP-ALIVE FUNCTION (Every 14 Minutes)
───────────────────────────────────────── */
// ⚠️ IMPORTANT: Replace this URL with your ACTUAL Render backend URL!
// Add /api/ping to the end!
const backendUrl = "https://rail-ticket-sharing-backend.onrender.com/api/ping";

setInterval(
  async () => {
    try {
      const response = await fetch(backendUrl);
      if (response.ok) {
        console.log("⏰ Kept server awake!");
      }
    } catch (err) {
      console.error("❌ Keep-awake failed:", err.message);
    }
  },
  14 * 60 * 1000,
); // 14 minutes

/* ───────────────────────────────────────── */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
