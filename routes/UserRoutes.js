import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateUser,
  addFavourite,
  removeFavourite,
  verifyEmail,
  updatePassword,
  purchaseStorage,
  getStorageInfo,
} from '../controllers/UserController';
import verifyToken from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);

// Protected routes (require authentication)
router.get('/me', verifyToken, getCurrentUser);
router.put('/update', verifyToken, updateUser);
router.put('/update-password', verifyToken, updatePassword);
router.get('/storage', verifyToken, getStorageInfo);
router.post('/purchase-storage', verifyToken, purchaseStorage);
router.post('/favorites/:userId', verifyToken, addFavourite);
router.delete('/favorites/:userId', verifyToken, removeFavourite);

export default router;
