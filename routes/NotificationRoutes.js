import express from 'express';
import {
  getAllNotifications,
  getNotificationById,
  getUserNotifications,
  sendNotification,
  deleteNotification,
} from '../controllers/NotificationController';
import verifyToken from '../middleware/auth';
// import { isAdmin } from '../middleware/roles';

const router = express.Router();

// Protected routes
router.get('/', verifyToken, getAllNotifications);
router.get('/:id', verifyToken, getNotificationById);
router.get('/user/me', verifyToken, getUserNotifications);
router.post('/', verifyToken, sendNotification);
router.delete('/:id', verifyToken, deleteNotification);

export default router;
