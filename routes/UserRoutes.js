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
  getAllUsers,
  sendVerificationEmail,
  // startStripeOnboarding,
  // checkStripeAccountStatus,
} from '../controllers/UserController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();
// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/send-email', sendVerificationEmail);
// Protected routes (require authentication)
router.get('/me', verifyToken, getCurrentUser);
router.get('/', getAllUsers);
router.put('/update', verifyToken, updateUser);
router.put('/update-password', verifyToken, updatePassword);
router.get('/storage', verifyToken, getStorageInfo);
router.post('/purchase-storage', verifyToken, purchaseStorage);
router.post('/favorites/:userId', verifyToken, addFavourite);
router.delete('/favorites/:userId', verifyToken, removeFavourite);
// router.post('/stripe/onboard', verifyToken, startStripeOnboarding);
// router.get('/stripe/account-status', verifyToken, checkStripeAccountStatus);

export default router;
