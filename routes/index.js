import express from 'express';
import UserRoutes from './UserRoutes';
import ReviewRoutes from './ReviewRoutes';
// import PhotoRoutes from './PhotoRoutes'
import NotificationRoutes from './NotificationRoutes';
import FeedbackRoutes from './FeedbackRoutes';
import EventRoutes from './EventRoutes';
import ChatRoutes from './ChatRoutes';

const router = express.Router();

router.use('users', UserRoutes);
router.use('reviews', ReviewRoutes);
router.use('notifications', NotificationRoutes);
router.use('feedbacks', FeedbackRoutes);
router.use('events', EventRoutes);
router.use('chats', ChatRoutes);

export default router;
