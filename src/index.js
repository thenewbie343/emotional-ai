// Main application entry point
const express = require('express');
const path = require('path');
const { setupDatabase } = require('./database/setup');
const apiRoutes = require('./api/routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Serve the main HTML file for all other routes (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database
setupDatabase()
  .then(() => {
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Emotional AI server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });