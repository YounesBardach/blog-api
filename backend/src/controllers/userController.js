import asyncHandler from 'express-async-handler';
import * as userService from '../services/userService.js';

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
    const error = new Error('Failed to set authentication cookie');
    error.name = 'CookieError'; // For errorMiddleware to categorize
    error.statusCode = 500;
    error.errors = {
      operation: 'set_cookie',
      code: 'COOKIE_SET_FAILURE',
      details: cookieError.message,
    };
    throw error; // Let asyncHandler forward to errorMiddleware
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
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res
      .status(200)
      .json({ success: true, status: 'success', data: { message: 'Logged out successfully' } });
  } catch (cookieError) {
    // This catch block is for cookie clearing errors during logout
    const error = new Error('Failed to clear authentication cookie during logout');
    error.name = 'CookieError';
    error.statusCode = 500;
    error.errors = {
      operation: 'clear_cookie',
      code: 'COOKIE_CLEAR_FAILURE',
      details: cookieError.message,
    };
    // Unlike setAuthCookie, here we call next(error) because logoutUser is an async route handler.
    // If we just `throw error`, asyncHandler might not catch it in the same way as a sync function.
    // Or, to be absolutely sure with asyncHandler, we could make logoutUser not an asyncHandler
    // and call next(error) explicitly, or ensure setAuthCookie also calls next(error).
    // For now, direct next(error) is safest within an asyncHandler for explicit error passing.
    return next(error);
  }
});

export const getUserProfile = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const user = await userService.findUserProfileById(req.user.id);
  res.status(200).json({ success: true, status: 'success', data: { user } });
});
