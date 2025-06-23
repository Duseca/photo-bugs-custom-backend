import express from 'express';
import {
  getAllEvents,
  getEventById,
  getCurrentUserEvents,
  getPhotographerEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  addRecipients,
  acceptInvite,
  searchEvents,
} from '../controllers/EventController';
import verifyToken from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getAllEvents);
router.get('/:id', verifyToken, getEventById);
router.get('/search', verifyToken, searchEvents);
router.get('/me/created', verifyToken, getCurrentUserEvents);
router.get('/me/photographer', verifyToken, getPhotographerEvents);
router.post('/', verifyToken, createEvent);
router.put('/:id', verifyToken, updateEvent);
router.delete('/:id', verifyToken, deleteEvent);
router.post('/:id/recipients', verifyToken, addRecipients);
router.put('/:id/accept', verifyToken, acceptInvite);

export default router;
