import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRegistration, validateLogin } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/logout', logoutUser);

// Protected routes
router.get('/profile', protect, getUserProfile);

export default router;
