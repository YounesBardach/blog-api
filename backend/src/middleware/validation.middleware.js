import { body, validationResult } from 'express-validator';

// Sanitization helper functions
const sanitizeUsername = (value) => {
  if (!value) return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
};

const sanitizePassword = (value) => {
  if (!value) return value;
  return value.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
};

const sanitizeEmail = (value) => {
  if (!value) return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove potential XSS
    .replace(/data:/gi, '') // Remove potential XSS
    .replace(/vbscript:/gi, ''); // Remove potential XSS
};

// Validation middleware for registration
export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .customSanitizer(sanitizeEmail)
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .customSanitizer(sanitizeUsername)
    .matches(/^[a-z0-9]+$/)
    .withMessage('Username can only contain lowercase letters and numbers'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .customSanitizer(sanitizePassword),
  body('name').notEmpty().withMessage('Name is required').trim().escape(), // Escape HTML entities
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Throw a plain error with name 'ValidationError' and attach errors array
      const error = new Error('Validation Error');
      error.name = 'ValidationError';
      error.statusCode = 400;
      error.errors = errors.array();
      return next(error);
    }
    next();
  },
];

// Validation middleware for login
export const validateLogin = [
  body('username').notEmpty().withMessage('Username is required').customSanitizer(sanitizeUsername),
  body('password').notEmpty().withMessage('Password is required').customSanitizer(sanitizePassword),
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Throw a plain error with name 'ValidationError' and attach errors array
      const error = new Error('Validation Error');
      error.name = 'ValidationError';
      error.statusCode = 400;
      error.errors = errors.array();
      return next(error);
    }
    next();
  },
];

// Validation middleware for updating a comment
export const validateCommentUpdate = [
  body('content').notEmpty().withMessage('Comment content cannot be empty').trim().escape(),
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Throw a plain error with name 'ValidationError' and attach errors array
      const error = new Error('Validation Error');
      error.name = 'ValidationError';
      error.statusCode = 400;
      error.errors = errors.array();
      return next(error);
    }
    next();
  },
];
