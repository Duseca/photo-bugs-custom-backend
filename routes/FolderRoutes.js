import express from 'express';
import {
  getFoldersByEvent,
  getFolderById,
  acceptInvite,
  declineInvite,
  createFolder,
  getAllFolders,
} from '../controllers/FolderController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.get('/event/:eventId', verifyToken, getFoldersByEvent);
router.get('/:id', verifyToken, getFolderById);
router.put('/:id/accept', verifyToken, acceptInvite);
router.put('/:id/decline', verifyToken, declineInvite);
router.post('/', verifyToken, createFolder);
router.get('/', verifyToken, getAllFolders);
export default router;
