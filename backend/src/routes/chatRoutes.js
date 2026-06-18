const express = require('express');
const router = express.Router();
const { auth, optionalAuth, requireAgent } = require('../middleware/auth');
const {
  createChat,
  getChat,
  getUserChats,
  takeOverChat,
  getActiveChats,
  closeChat
} = require('../controllers/chatController');

// Optional auth route for chat creation (widget and logged-in users)
router.post('/create', optionalAuth, createChat);

// Protected routes (place specific routes before parameterized ones)
router.get('/user/:userId', auth, getUserChats);
router.post('/takeover', auth, requireAgent, takeOverChat);
router.get('/active', auth, requireAgent, getActiveChats);
router.put('/:chatId/close', auth, requireAgent, closeChat);
router.get('/:chatId', auth, getChat);

module.exports = router;
