import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from cookie
  token = req.cookies.jwt;

  if (!token) {
    return next(new AppError('Not authorized, no token', 401, {
      code: 'MISSING_TOKEN',
      field: 'authorization',
      details: 'No JWT token found in cookies'
    }));
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

    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401, {
      code: 'INVALID_TOKEN',
      field: 'authorization',
      details: error.message
    }));
  }
});

// Middleware to check if user is admin
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return next(new AppError('Not authorized as an admin', 403, {
      code: 'UNAUTHORIZED_ACCESS',
      requiredRole: 'ADMIN',
      userRole: req.user?.role || 'none',
      details: 'Admin privileges required for this operation'
    }));
  }
}; 