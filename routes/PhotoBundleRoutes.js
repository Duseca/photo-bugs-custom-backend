import express from 'express';
import {
  createPhotoBundle,
  getBundlesByFolder,
  getBundle,
  updateBundle,
  deleteBundle,
  purchaseBundle,
} from '../controllers/PhotoBundleController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, createPhotoBundle);
router.get('/folder/:folderId', verifyToken, getBundlesByFolder);
router.get('/:id', verifyToken, getBundle);
router.put('/:id', verifyToken, updateBundle);
router.delete('/:id', verifyToken, deleteBundle);
router.post('/:id/purchase', verifyToken, purchaseBundle);

export default router;
