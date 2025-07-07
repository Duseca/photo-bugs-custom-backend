import express from 'express';

import UserRoutes from './UserRoutes.js';
import ReviewRoutes from './ReviewRoutes.js';
// import PhotoRoutes from './PhotoRoutes'
import NotificationRoutes from './NotificationRoutes.js';
import FeedbackRoutes from './FeedbackRoutes.js';
import EventRoutes from './EventRoutes.js';
import ChatRoutes from './ChatRoutes.js';

const router = express.Router();

router.use('/users', UserRoutes);
router.use('/reviews', ReviewRoutes);
router.use('/notifications', NotificationRoutes);
router.use('/feedbacks', FeedbackRoutes);
router.use('/events', EventRoutes);
router.use('/chats', ChatRoutes);

export default router;
