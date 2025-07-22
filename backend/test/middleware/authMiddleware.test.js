import jwt from 'jsonwebtoken';
import { protect, admin } from '../../src/middleware/authMiddleware.js';

// Mock the prisma module that the middleware actually uses
vi.mock('../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '../../src/config/prisma.js';

describe('Authentication Middleware', () => {
  const createMockReq = (cookieValue) => ({
    cookies: { jwt: cookieValue },
  });

  const createMockRes = () => ({});

  const createMockNext = () => vi.fn();

  describe('protect middleware', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      jwt.verify = vi.fn();
      prisma.user.findUnique.mockClear();
    });

    it('allow access if valid token/user', async () => {
      const mockUser = {
        id: '123',
        name: 'testuser',
        email: 'test@example.com',
        username: 'testuser',
        role: 'READER',
      };

      // Mock jwt.verify and prisma user lookup
      jwt.verify.mockReturnValue({ id: '123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const req = createMockReq('valid.jwt.token');
      const res = createMockRes();
      const next = createMockNext();

      await protect(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith(); // no error
    });

    it('calls next with error if no token is present', async () => {
      const req = createMockReq(undefined);
      const res = createMockRes();
      const next = createMockNext();

      await protect(req, res, next);

      // next.mock.calls[0][0] is the first argument passed to the next function
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('MissingTokenError');
    });

    it('calls next with error if token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const req = createMockReq('invalid.token');
      const res = createMockRes();
      const next = createMockNext();

      await protect(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toBe('invalid token');
    });

    it('calls next with error if user not found', async () => {
      jwt.verify.mockReturnValue({ id: 'not-found' });
      prisma.user.findUnique.mockResolvedValue(null);

      const req = createMockReq('valid.token.but.user.missing');
      const res = createMockRes();
      const next = createMockNext();

      await protect(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UserNotFoundForTokenError');
    });
  });

  describe('admin middleware', () => {
    it('calls next if user is admin', () => {
      const req = { user: { role: 'ADMIN' } };
      const res = {};
      const next = createMockNext();

      admin(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('calls next with error if user is not admin', () => {
      const req = { user: { role: 'READER' } };
      const res = {};
      const next = createMockNext();

      admin(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('calls next with error if req.user is missing', () => {
      const req = {};
      const res = {};
      const next = createMockNext();

      admin(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });
  });
});
