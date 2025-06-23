import express from 'express';
import {
  getAllFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedbackSuggestions,
} from '../controllers/FeedbackController';
import verifyToken from '../middleware/auth';
// import { isAdmin } from '../middleware/roles';

const router = express.Router();

// Protected routes
router.get('/', verifyToken, getAllFeedback);
router.get('/:id', verifyToken, getFeedbackById);
router.post('/', verifyToken, createFeedback);
router.put('/:id', verifyToken, updateFeedback);
router.delete('/:id', verifyToken, deleteFeedback);
router.get('/user/suggestions', verifyToken, getUserFeedbackSuggestions);

export default router;
