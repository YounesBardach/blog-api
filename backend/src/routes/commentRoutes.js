import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
} from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/posts/:postId/comments', getPostComments);

// Protected routes
router.post('/posts/:postId/comments', protect, createComment);
router.put('/comments/:id', protect, updateComment);
router.delete('/comments/:id', protect, deleteComment);

export default router; 