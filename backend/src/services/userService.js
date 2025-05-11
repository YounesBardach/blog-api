import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

export const register = async ({ name, email, username, password }) => {
  // Check if user already exists
  const userExists = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (userExists) {
    throw new AppError('User already exists with this email or username', 400, {
      fields: {
        email: userExists.email === email ? 'Email already in use' : null,
        username: userExists.username === username ? 'Username already taken' : null,
      },
      code: 'DUPLICATE_ENTRY',
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
    throw new AppError('Invalid user data', 400, { code: 'INVALID_DATA' });
  }

  const token = generateToken(user.id);
  const userResponse = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };

  return { user: userResponse, token };
};

export const login = async ({ username, password }) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid credentials', 401, {
      field: 'credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const token = generateToken(user.id);
  const userResponse = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };

  return { user: userResponse, token };
};

export const findUserProfileById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      id: userId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }
  return user;
}; 