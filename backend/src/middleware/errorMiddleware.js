import { Prisma } from '@prisma/client';
import AppError from '../utils/AppError.js';

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = null;

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Unique constraint violation';
        errors = { [err.meta.target]: 'This value already exists' };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2021':
        statusCode = 404;
        message = 'Table does not exist';
        break;
      case 'P2022':
        statusCode = 404;
        message = 'Column does not exist';
        break;
      default:
        message = 'Database error occurred';
    }
  }

  // Handle Prisma connection errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Database connection error';
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(error => error.message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid CSRF token';
  }

  // Handle rate limiting errors
  if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
  }

  // Handle file upload errors
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 400;
        message = 'File size too large';
        break;
      case 'LIMIT_FILE_COUNT':
        statusCode = 400;
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400;
        message = 'Unexpected file type';
        break;
      default:
        statusCode = 400;
        message = 'File upload error';
    }
  }

  // Handle cookie errors
  if (err.name === 'CookieError') {
    statusCode = 400;
    message = 'Invalid cookie';
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  // Handle unhandled errors
  if (statusCode === 500) {
    // Log the error for debugging
    console.error('Unhandled error:', err);
    // Don't expose internal error details in production
    if (process.env.NODE_ENV !== 'development') {
      message = 'An unexpected error occurred';
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    status: new AppError(message, statusCode).status,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler; 