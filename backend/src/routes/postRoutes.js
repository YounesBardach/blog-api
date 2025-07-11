import express from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validatePostUpdate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/:id', getPostById);

// Protected routes (admin only)
router.post('/', protect, admin, createPost);
router.put('/:id', protect, admin, validatePostUpdate, updatePost);
router.delete('/:id', protect, admin, deletePost);

export default router;
