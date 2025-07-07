import express from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getAverageRating,
  getAllReviews,
  getReviewById,
} from '../controllers/ReviewController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/', verifyToken, getAllReviews);
router.get('/:id', verifyToken, getReviewById);
router.post('/', verifyToken, createReview);
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);
router.get('/average/:userId', verifyToken, getAverageRating);

export default router;
