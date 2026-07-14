// API routes for the Emotional AI application
const express = require('express');
const router = express.Router();
const aiController = require('./controllers/aiController');
const adminController = require('./controllers/adminController');
const { checkMessageLimit } = require('./middleware/subscriptionMiddleware');
const adminAuth = require('./middleware/adminAuth');
const userAuth = require('./middleware/userAuth');
const userController = require('./controllers/userController');

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
      SAI_GROQ_API_KEY:    !!process.env.SAI_GROQ_API_KEY,
      SAI_MISTRAL_API_KEY: !!process.env.SAI_MISTRAL_API_KEY,
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
router.post('/admin/requests', adminAuth, adminController.getRequests);
router.post('/admin/approve', adminAuth, adminController.approveRequest);
router.post('/admin/reject', adminAuth, adminController.rejectRequest);
router.post('/admin/users', adminAuth, adminController.getUsers);
router.post('/admin/block', adminAuth, adminController.toggleBlockUser);
router.post('/admin/change-password', adminAuth, adminController.changeUserPassword);
router.post('/admin/update-tier', adminAuth, adminController.updateUserTier);
router.post('/admin/delete-user', adminAuth, adminController.deleteUser);
router.post('/admin/approve-export', adminAuth, adminController.approveExport);
router.post('/admin/exports', adminAuth, adminController.getExports);

// Study Companion routes
const studyController = require('./controllers/studyController');
router.post('/study/roadmap/generate', studyController.generateCustomRoadmap);
router.post('/study/roadmap/save', studyController.saveRoadmap);
router.post('/study/roadmap/list', studyController.listRoadmaps);
router.post('/study/roadmap/update-lesson', studyController.updateLessonStatus);
router.post('/study/tasks/create', studyController.createTask);
router.post('/study/tasks/list', studyController.listTasks);
router.post('/study/tasks/toggle-completed', studyController.toggleTaskCompleted);
router.post('/study/logs/log-session', studyController.logStudySession);
router.post('/study/pomodoro/save', studyController.savePomodoroSession);
router.post('/study/pomodoro/list', studyController.getPomodoroSessions);
router.post('/study/logs/heatmap', studyController.getHeatmapData);
router.post('/study/heatmap', studyController.getHeatmapData);
router.post('/study/quiz/generate', studyController.generateQuiz);
router.post('/study/quiz/evaluate', studyController.evaluateQuizAnswer);

// Timetable Builder
router.post('/study/timetable/generate', studyController.generateTimetable);
router.post('/study/timetable/save', studyController.saveTimetable);
router.post('/study/timetable/list', studyController.getTimetables);
router.post('/study/timetable/update-schedule', studyController.updateTimetableSchedule);

// Universal Delete (Admin-Level Persistence)
router.post('/study/delete-record', studyController.deleteRecord);

// Mission Board
router.post('/study/missions/list', studyController.listMissions);
router.post('/study/missions/create', studyController.createMission);
router.post('/study/missions/complete', studyController.completeMission);
router.post('/study/missions/generate-daily', studyController.generateDailyMissions);

// Subject Mastery Tracker
router.post('/study/mastery/update', studyController.updateMastery);
router.post('/study/mastery/list', studyController.listMastery);
router.post('/study/mastery/suggest', studyController.suggestMasteryTopic);

// Exam Countdown
router.post('/study/countdown/comment', studyController.getCountdownComment);

// Phase 5: Ranks & Daily Challenges
router.post('/study/rank/message', studyController.getRankUpMessage);
router.post('/study/challenges/daily', studyController.generateDailyChallenge);
router.post('/study/challenges/complete', studyController.completeDailyChallenge);

// User Account Erasure route (DPDP / GDPR Right to Erasure)
router.delete('/user/erasure', userAuth, userController.deleteUserAccount);

module.exports = router;