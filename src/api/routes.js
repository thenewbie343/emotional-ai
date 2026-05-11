// API routes for the Emotional AI application
const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const conversationController = require('./controllers/conversationController');
const aiController = require('./controllers/aiController');

// User routes
router.post('/users/register', userController.register);
router.post('/users/login', userController.login);
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', userController.updateProfile);

// Conversation routes
router.get('/conversations', conversationController.getConversations);
router.get('/conversations/:id', conversationController.getConversation);
router.post('/conversations', conversationController.createConversation);

// Message routes
router.get('/conversations/:id/messages', conversationController.getMessages);
router.post('/conversations/:id/messages', conversationController.sendMessage);

// AI interaction routes
router.post('/ai/message', aiController.processMessage);
router.get('/ai/personality', aiController.getPersonality);

module.exports = router;