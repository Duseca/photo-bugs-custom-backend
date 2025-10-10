import express from 'express';
import {
  getCreatorImages,
  uploadImage,
  updateImage,
  deleteImage,
  getImageById,
  searchPhotos,
  //   buyImage,
  //   handleStripeWebhook,
} from '../controllers/PhotoController.js';
import verifyToken from '../middleware/auth.js';
import { getCreatorDownloadStats, trackDownload } from '../controllers/DownloadController.js';

const router = express.Router();

router.get('/creator', verifyToken, getCreatorImages);
router.post('/', verifyToken, uploadImage);
router.put('/:id', verifyToken, updateImage);
router.delete('/:id', verifyToken, deleteImage);
router.get('/search-photos', verifyToken, searchPhotos);
router.post('/track-download/:photoId', verifyToken, trackDownload);
router.get('/get-download-stats', verifyToken, getCreatorDownloadStats);
// router.post('/:id/buy', verifyToken, buyImage);

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   handleStripeWebhook
// );

export default router;
