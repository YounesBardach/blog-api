import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const error = new Error('User already exists with this email or username');
    error.name = 'DuplicateEntryError';
    error.statusCode = 409;
    error.errors = {
      fields: {
        email: userExists.email === email ? 'Email already in use' : undefined,
        username: userExists.username === username ? 'Username already taken' : undefined,
      },
      code: 'DUPLICATE_ENTRY',
    };
    throw error;
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
    const error = new Error('Invalid user data during registration');
    error.name = 'InvalidDataError';
    error.statusCode = 400;
    error.errors = {
      code: 'REGISTRATION_INVALID_DATA',
      details: 'User creation failed with provided data.',
    };
    throw error;
  }

  const token = generateToken(user.id);
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  return { user: userResponse, token };
};

export const login = async ({ username, password }) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid credentials');
    error.name = 'AuthenticationError';
    error.statusCode = 401;
    error.errors = {
      field: 'credentials',
      code: 'INVALID_CREDENTIALS',
      details: 'The username or password provided is incorrect.',
    };
    throw error;
  }

  const token = generateToken(user.id);
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
  };

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
    const error = new Error('User not found');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'user',
      id: userId,
      code: 'USER_NOT_FOUND',
      details: `User with ID '${userId}' was not found.`,
    };
    throw error;
  }
  return user;
};
