import express from 'express';

import verifyToken from '../middleware/auth.js';
import {
  getAllTransactions,
  getTransaction,
  getUserTransactionsBought,
  getUserTransactionsSold,
} from '../controllers/TransactionController.js';

const router = express.Router();

router.get('/', verifyToken, getAllTransactions);
router.get('/:id', verifyToken, getTransaction);
router.get('/seller/:id', verifyToken, getUserTransactionsSold);
router.get('/buyer/:id', verifyToken, getUserTransactionsBought);

// router.post('/:id/buy', verifyToken, buyImage);

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   handleStripeWebhook
// );

export default router;
