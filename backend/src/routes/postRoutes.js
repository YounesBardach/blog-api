import express from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController.js';
import { protect, author } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/:id', getPostById);

// Protected routes
router.post('/', protect, author, createPost);
router.put('/:id', protect, author, updatePost);
router.delete('/:id', protect, author, deletePost);

export default router; 