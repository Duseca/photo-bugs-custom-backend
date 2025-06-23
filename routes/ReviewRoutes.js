import express from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getAverageRating,
} from '../controllers/ReviewControllerController';
import verifyToken from '../middleware/auth';
import { getAllReviews, getReviewById } from '../controllers/ReviewController';

const router = express.Router();

// Protected routes
router.get('/', verifyToken, getAllReviews);
router.get('/:id', verifyToken, getReviewById);
router.post('/', verifyToken, createReview);
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);
router.get('/average/:userId', verifyToken, getAverageRating);

export default router;
