import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
} from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateCommentUpdate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.get('/post/:postId', getPostComments);

// Protected routes
router.post('/post/:postId', protect, createComment);
router.put('/:id', protect, validateCommentUpdate, updateComment);
router.delete('/:id', protect, deleteComment);

export default router;
