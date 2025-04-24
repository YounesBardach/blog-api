import { body, validationResult } from 'express-validator';

// Validation middleware for registration
export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .trim(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation middleware for login
export const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 