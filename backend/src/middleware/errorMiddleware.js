import { Prisma } from '@prisma/client';

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
      default:
        message = 'Database error occurred';
    }
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

  // Handle custom application errors
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler; 