import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { protect, admin } from '../../src/middleware/authMiddleware.js';
import { prisma } from '../setup.js';
import { createTestUser, generateTestToken } from '../helpers/testHelpers.js';

// Mock response and next function
const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('protect middleware', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'auth@example.com',
        username: 'authuser',
      });
      validToken = generateTestToken(testUser.id);
    });

    it('should authenticate user with valid token', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.user.email).toBe(testUser.email);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      const req = {
        headers: {},
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Not authorized'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat',
        },
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalidtoken',
        },
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for non-existent user', async () => {
      const tokenForNonExistentUser = generateTestToken(999999);

      const req = {
        headers: {
          authorization: `Bearer ${tokenForNonExistentUser}`,
        },
      };
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('admin middleware', () => {
    it('should allow access for admin user', async () => {
      const adminUser = await createTestUser({
        email: 'admin@example.com',
        username: 'adminuser',
        role: 'ADMIN',
      });

      const req = {
        user: adminUser,
      };
      const res = mockResponse();

      admin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for regular user', async () => {
      const regularUser = await createTestUser({
        email: 'regular@example.com',
        username: 'regularuser',
        role: 'USER',
      });

      const req = {
        user: regularUser,
      };
      const res = mockResponse();

      admin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Admin access required'),
        })
      );
    });

    it('should deny access when user is not set', async () => {
      const req = {};
      const res = mockResponse();

      admin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should deny access for user without role', async () => {
      const userWithoutRole = await createTestUser({
        email: 'norole@example.com',
        username: 'noroleuser',
      });

      // Remove role property to simulate edge case
      delete userWithoutRole.role;

      const req = {
        user: userWithoutRole,
      };
      const res = mockResponse();

      admin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
