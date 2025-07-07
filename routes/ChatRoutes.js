import express from 'express';
import {
  createChat,
  getUserChats,
  addMessage,
  updateMessage,
  deleteMessage,
  updateLastSeen,
} from '../controllers/ChatController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.post('/', verifyToken, createChat);
router.get('/', verifyToken, getUserChats);
router.post('/:id/messages', verifyToken, addMessage);
router.put('/:chatId/messages/:messageId', verifyToken, updateMessage);
router.delete('/:chatId/messages/:messageId', verifyToken, deleteMessage);
router.put('/:id/last-seen', verifyToken, updateLastSeen);

export default router;
