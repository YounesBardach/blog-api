import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, username, password } = req.body;

    // Check if user already exists
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (userExists) {
      throw new AppError('User already exists with this email or username', 400, {
        fields: {
          email: userExists.email === email ? 'Email already in use' : null,
          username: userExists.username === username ? 'Username already taken' : null
        },
        code: 'DUPLICATE_ENTRY'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        passwordHash,
      },
    });

    if (!user) {
      throw new AppError('Invalid user data', 400, {
        fields: {
          name: 'Name is required',
          email: 'Valid email is required',
          username: 'Username is required',
          password: 'Password is required'
        },
        code: 'INVALID_DATA'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    try {
      // Set HTTP-only cookie with JWT token
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    } catch (cookieError) {
      throw new AppError('Failed to set authentication cookie', 500, {
        operation: 'set_cookie',
        code: 'COOKIE_ERROR',
        details: cookieError.message
      });
    }

    res.status(201).json({
      success: true,
      status: 'success',
      data: { user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role } }
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check for user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid credentials', 401, {
        field: 'credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    try {
      // Set HTTP-only cookie with JWT token
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    } catch (cookieError) {
      throw new AppError('Failed to set authentication cookie', 500, {
        operation: 'set_cookie',
        code: 'COOKIE_ERROR',
        details: cookieError.message
      });
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: { user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role } }
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    // Clear the JWT cookie
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: { message: 'Logged out successfully' }
    });
  } catch (error) {
    next(new AppError('Failed to clear authentication cookie', 500, {
      operation: 'clear_cookie',
      code: 'COOKIE_ERROR',
      details: error.message
    }));
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, {
        resource: 'user',
        id: req.user.id,
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
}; 