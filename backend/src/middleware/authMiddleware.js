import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import prisma from '../config/prisma.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from cookie
  token = req.cookies.jwt;

  if (!token) {
    const error = new Error('Not authorized, no token');
    error.statusCode = 401;
    error.name = 'MissingTokenError';
    error.errors = {
      code: 'MISSING_TOKEN',
      field: 'authorization',
      details: 'No JWT token found in cookies. Access requires authentication.',
    };
    return next(error);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
      },
    });

    if (!req.user) {
      const error = new Error('User for token not found');
      error.statusCode = 401;
      error.name = 'UserNotFoundForTokenError';
      error.errors = {
        code: 'USER_FOR_TOKEN_NOT_FOUND',
        details: 'The user associated with the provided token could not be found.',
      };
      return next(error);
    }

    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
    }
    if (!error.name || error.name === 'Error') {
      error.name = 'TokenVerificationError';
    }
    return next(error);
  }
});

// Middleware to check if user is admin
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    const error = new Error('Not authorized as an admin');
    error.statusCode = 403;
    error.name = 'ForbiddenError';
    error.errors = {
      code: 'ADMIN_ACCESS_REQUIRED',
      requiredRole: 'ADMIN',
      userRole: req.user?.role || 'none',
      details: 'This resource or operation requires administrator privileges.',
    };
    return next(error);
  }
};
