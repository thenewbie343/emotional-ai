require('dotenv').config();
// Main application entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api/routes');
const parasiteRoutes = require('../server/api/parasiteRoutes');
const { startAbsenceWorker } = require('../server/jobs/absenceWorker');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Parasite Engine routes
app.use('/api/parasite', parasiteRoutes);

// Parasite Engine routes

// Start background absence worker (runs every 6 hours)
startAbsenceWorker();

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emotional AI server running on port ${PORT}`);
});