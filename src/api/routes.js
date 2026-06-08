// API routes for the Emotional AI application
const express = require('express');
const router = express.Router();
const aiController = require('./controllers/aiController');
const adminController = require('./controllers/adminController');
const { checkMessageLimit } = require('./middleware/subscriptionMiddleware');

// Health check — shows which keys are loaded (safe, no values exposed)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    keys: {
      GROQ_API_KEY:        !!process.env.GROQ_API_KEY,
      GEMINI_API_KEY:      !!process.env.GEMINI_API_KEY,
      MISTRAL_API_KEY:     !!process.env.MISTRAL_API_KEY,
      COHERE_API_KEY:      !!process.env.COHERE_API_KEY,
      OPENROUTER_API_KEY:  !!process.env.OPENROUTER_API_KEY,
      SUPABASE_URL:        !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY:   !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
});

// AI interaction routes
router.post('/ai/message', checkMessageLimit, aiController.processMessage);
router.get('/ai/personality', aiController.getPersonality);

// Admin routes
router.post('/admin/requests', adminController.getRequests);
router.post('/admin/approve', adminController.approveRequest);
router.post('/admin/reject', adminController.rejectRequest);
router.post('/admin/users', adminController.getUsers);
router.post('/admin/block', adminController.toggleBlockUser);
router.post('/admin/change-password', adminController.changeUserPassword);
router.post('/admin/update-tier', adminController.updateUserTier);

module.exports = router;