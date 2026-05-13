// API routes for the Emotional AI application
const express = require('express');
const router = express.Router();
const aiController = require('./controllers/aiController');

// AI interaction routes
router.post('/ai/message', aiController.processMessage);
router.get('/ai/personality', aiController.getPersonality);

module.exports = router;