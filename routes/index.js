import express from 'express';
import UserRoutes from './UserRoutes.js';
import ReviewRoutes from './ReviewRoutes.js';
import PhotoRoutes from './PhotoRoutes.js';
import PhotoBundleRoutes from './PhotoBundleRoutes.js';
import PortfolioRoutes from './PortfolioRoutes.js';
import NotificationRoutes from './NotificationRoutes.js';
import FeedbackRoutes from './FeedbackRoutes.js';
import EventRoutes from './EventRoutes.js';
import FolderRoutes from './FolderRoutes.js';
import ChatRoutes from './ChatRoutes.js';
import TransactionRoutes from './TransactionRoutes.js';

const router = express.Router();

router.use('/users', UserRoutes);
router.use('/reviews', ReviewRoutes);
router.use('/notifications', NotificationRoutes);
router.use('/feedbacks', FeedbackRoutes);
router.use('/events', EventRoutes);
router.use('/chats', ChatRoutes);
router.use('/folders', FolderRoutes);
router.use('/photos', PhotoRoutes);
router.use('/portfolio', PortfolioRoutes);
router.use('/photo-bundles', PhotoBundleRoutes);
router.use('/transactions', TransactionRoutes);

export default router;
