const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

/* ─────────────────────────────────────────
   MongoDB Connection
───────────────────────────────────────── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

/* ─────────────────────────────────────────
   User Schema
───────────────────────────────────────── */
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

/* ─────────────────────────────────────────
   Ticket Schema
───────────────────────────────────────── */
const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  boardingStation: { type: String, required: true },
  destinationStation: { type: String, required: true },

  dateOfJourney: { type: String, required: true },
  trainName: { type: String, required: true },
  trainNumber: { type: String, required: true },
  departureTime: { type: String, required: true },

  classType: { type: String, required: true },
  ticketStatus: { type: String, required: true },

  racOrWaitingNumber: { type: String, default: '' },

  numberOfPassengers: { type: Number, required: true },

  passengers: [
    {
      gender: String,
      age: Number
    }
  ],

  price: { type: Number, required: true }

}, { timestamps: true });

ticketSchema.index({ boardingStation: 1 });
ticketSchema.index({ destinationStation: 1 });
ticketSchema.index({ dateOfJourney: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

/* ─────────────────────────────────────────
   Station Schema
───────────────────────────────────────── */

const stationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: String,

  searchText: {
    type: String,
    index: true
  }

});

stationSchema.index({ name: 1 });
stationSchema.index({ code: 1 });

/* 🔹 Create searchable text automatically */
stationSchema.pre('save', function(next) {

  this.searchText = (
    this.code + " " +
    this.name
  ).toLowerCase();

  next();

});

const Station = mongoose.model('Station', stationSchema);

/* ─────────────────────────────────────────
   JWT Middleware
───────────────────────────────────────── */
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token)
    return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/* ─────────────────────────────────────────
   AUTH ROUTES
───────────────────────────────────────── */

app.post('/api/auth/register', async (req, res) => {
  try {

    const { firstName, lastName, email, mobile, password } = req.body;

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password: hashed
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName,
        lastName,
        email,
        mobile
      }
    });

  } catch (err) {

    if (err.code === 11000)
      return res.status(400).json({ message: 'Email or Mobile already exists' });

    res.status(500).json({ message: err.message });

  }
});


app.post('/api/auth/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile
      }
    });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});


/* ─────────────────────────────────────────
   UPDATE PROFILE
───────────────────────────────────────── */

app.put('/api/users/update', authMiddleware, async (req, res) => {

  try {

    const { firstName, lastName, mobile } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, mobile },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        mobile: updatedUser.mobile
      }
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

app.get('/api/stations', async (req, res) => {

  try {

    const { query } = req.query;

    if (!query || query.length < 1)
      return res.json([]);

    const q = query.toLowerCase().trim();

    const stations = await Station.aggregate([

      {
        $addFields: {

          codeMatch: {
            $cond: [
              { $regexMatch: { input: { $toLower: "$code" }, regex: "^" + q } },
              1,
              0
            ]
          },

          nameStartMatch: {
            $cond: [
              { $regexMatch: { input: { $toLower: "$name" }, regex: "^" + q } },
              1,
              0
            ]
          }

        }
      },

      {
        $match: {
          searchText: { $regex: q }
        }
      },

      {
        $sort: {
          codeMatch: -1,
          nameStartMatch: -1,
          name: 1
        }
      },

      {
        $limit: 10
      }

    ]);

    res.json(stations);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});


/* ─────────────────────────────────────────
   CREATE TICKET
───────────────────────────────────────── */

app.post('/api/tickets', authMiddleware, async (req, res) => {

  try {

    const ticket = await Ticket.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(ticket);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});


/* ─────────────────────────────────────────
   SEARCH TICKETS
───────────────────────────────────────── */

app.get('/api/tickets', async (req, res) => {
  try {

    const { boarding, destination, date } = req.query;

    const query = {};

    if (boarding) {
      const code = boarding.split('-')[0].trim();
      query.boardingStation = { $regex: code, $options: 'i' };
    }

    if (destination) {
      const code = destination.split('-')[0].trim();
      query.destinationStation = { $regex: code, $options: 'i' };
    }

    if (date)
      query.dateOfJourney = date;

    const tickets = await Ticket.find(query)
      .populate('userId', 'firstName lastName email mobile')
      .sort({ createdAt: -1 });

    res.json(tickets);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ─────────────────────────────────────────
   USER TICKETS
───────────────────────────────────────── */

app.get('/api/tickets/user/:id', authMiddleware, async (req, res) => {

  try {

    if (req.user.id !== req.params.id)
      return res.status(403).json({ message: 'Not authorized' });

    const tickets = await Ticket.find({ userId: req.params.id })
      .sort({ createdAt: -1 });

    res.json(tickets);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});


/* ─────────────────────────────────────────
   DELETE TICKET
───────────────────────────────────────── */

app.delete('/api/tickets/:id', authMiddleware, async (req, res) => {

  try {

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket)
      return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.userId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    await ticket.deleteOne();

    res.json({ message: 'Ticket deleted successfully' });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});


/* ───────────────────────────────────────── */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);