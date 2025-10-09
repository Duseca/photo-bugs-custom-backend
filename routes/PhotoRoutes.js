import express from 'express';
import {
  getCreatorImages,
  uploadImage,
  updateImage,
  deleteImage,
  getImageById,
  //   buyImage,
  //   handleStripeWebhook,
} from '../controllers/PhotoController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.get('/creator', verifyToken, getCreatorImages);
router.post('/', verifyToken, uploadImage);
router.put('/:id', verifyToken, updateImage);
router.delete('/:id', verifyToken, deleteImage);
// router.post('/:id/buy', verifyToken, buyImage);

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   handleStripeWebhook
// );

export default router;
