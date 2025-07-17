import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../setup.js';

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(userId, expiresIn = '1h') {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
}

/**
 * Create a test user in the database
 */
//user schema is off from the actual user schema
export async function createTestUser(userData = {}) {
  const defaultUser = {
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: await bcrypt.hash('password123', 12),
    isVerified: true,
    ...userData,
  };

  const user = await prisma.user.create({
    data: defaultUser,
  });

  return user;
}

/**
 * Create a test post in the database
 */
export async function createTestPost(userId, postData = {}) {
  const defaultPost = {
    title: 'Test Post',
    content: 'This is a test post content',
    excerpt: 'Test excerpt',
    published: true,
    authorId: userId,
    ...postData,
  };

  const post = await prisma.post.create({
    data: defaultPost,
  });

  return post;
}

/**
 * Create a test comment in the database
 */
export async function createTestComment(userId, postId, commentData = {}) {
  const defaultComment = {
    content: 'This is a test comment',
    authorId: userId,
    postId: postId,
    ...commentData,
  };

  const comment = await prisma.comment.create({
    data: defaultComment,
  });

  return comment;
}

/**
 * Clean up all test data
 */
export async function cleanUpTestData() {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Get CSRF token from response cookies
 */
export function getCsrfToken(response) {
  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader) return null;

  const csrfCookie = setCookieHeader.find((cookie) => cookie.startsWith('XSRF-TOKEN='));

  if (!csrfCookie) return null;

  return csrfCookie.split('=')[1].split(';')[0];
}

/**
 * Create authenticated request headers with JWT token
 */
export function createAuthHeaders(token, csrfToken = null) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  return headers;
}
