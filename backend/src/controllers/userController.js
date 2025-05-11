import asyncHandler from 'express-async-handler';
import * as userService from '../services/userService.js';
import AppError from '../utils/AppError.js';

// Helper function to set the auth cookie
const setAuthCookie = (res, token) => {
  try {
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  } catch (cookieError) {
    // Throw an AppError instead of logging here, let the main error handler manage it
    throw new AppError('Failed to set authentication cookie', 500, {
      operation: 'set_cookie',
      code: 'COOKIE_ERROR',
      details: cookieError.message,
    });
  }
};

export const registerUser = asyncHandler(async (req, res, next) => {
  const { user, token } = await userService.register(req.body);
  setAuthCookie(res, token);
  res.status(201).json({ success: true, status: 'success', data: { user } });
});

export const loginUser = asyncHandler(async (req, res, next) => {
  const { user, token } = await userService.login(req.body);
  setAuthCookie(res, token);
  res.status(200).json({ success: true, status: 'success', data: { user } });
});

export const logoutUser = asyncHandler(async (req, res, next) => {
  // Clear the JWT cookie
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({ success: true, status: 'success', data: { message: 'Logged out successfully' } });
  // Note: Catching specific cookie errors might still need try/catch if not handled by asyncHandler
  // However, the general approach is to let errors propagate.
  // If AppError is thrown by setAuthCookie, asyncHandler should catch it.
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const user = await userService.findUserProfileById(req.user.id);
  res.status(200).json({ success: true, status: 'success', data: { user } });
}); 