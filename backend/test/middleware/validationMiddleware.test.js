import {
  validateRegistration,
  validateLogin,
  validatePostUpdate,
  validateCommentUpdate,
} from '../src/middleware/validationMiddleware.js';

describe('Validation Middleware', () => {
  // Helper function to run middleware chain
  const runMiddlewareChain = async (middlewareArray, req, res, next) => {
    for (const middleware of middlewareArray) {
      // Stop if next has been called (error)
      if (next.mock.calls.length > 0) {
        break;
      }
      await middleware(req, res, next);
    }
  };

  const createMockReq = (body = {}) => ({
    body,
  });

  const createMockRes = () => ({});
  const createMockNext = () => vi.fn();

  describe('validateRegistration', () => {
    it('should call next for valid registration data', async () => {
      const req = createMockReq({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
      });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateRegistration, req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should sanitize and normalize registration inputs', async () => {
      const req = createMockReq({
        email: '  TEST@EXAMPLE.COM ',
        username: '  My_User1! ',
        password: '  password123\r\n',
        name: '  Test User  ',
      });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateRegistration, req, res, next);
      expect(req.body.email).toBe('test@example.com');
      expect(req.body.username).toBe('myuser1');
      expect(req.body.password).toBe('password123');
      expect(req.body.name).toBe('Test User');
    });

    it('should call next with an error for invalid email', async () => {
      const req = createMockReq({
        email: 'not-an-email',
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
      });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateRegistration, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toBe('Please provide a valid email');
    });

    it('should call next with an error for a short password', async () => {
      const req = createMockReq({
        email: 'test@example.com',
        username: 'testuser',
        password: '123',
        name: 'Test User',
      });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateRegistration, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toBe('Password must be at least 6 characters long');
    });
  });

  describe('validateLogin', () => {
    it('should call next for valid login data', async () => {
      const req = createMockReq({ username: 'testuser', password: 'password12p3' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateLogin, req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with an error if username is missing', async () => {
      const req = createMockReq({ password: 'password123' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateLogin, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toBe('Username is required');
    });
  });

  describe('validatePostUpdate', () => {
    it('should call next when providing only a title', async () => {
      const req = createMockReq({ title: 'New Title' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validatePostUpdate, req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next when providing only content', async () => {
      const req = createMockReq({ content: 'New content.' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validatePostUpdate, req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next and escape inputs', async () => {
      const req = createMockReq({ title: '<script>alert("xss")</script>' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validatePostUpdate, req, res, next);
      expect(req.body.title).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with an error for an empty request body', async () => {
      const req = createMockReq({});
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validatePostUpdate, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toContain('Request body cannot be empty');
    });

    it('should call next with an error for an empty title string', async () => {
      const req = createMockReq({ title: '  ' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validatePostUpdate, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toBe('Title cannot be empty');
    });
  });

  describe('validateCommentUpdate', () => {
    it('should call next for valid comment data', async () => {
      const req = createMockReq({ content: 'This is an updated comment.' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateCommentUpdate, req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next and escape content', async () => {
      const req = createMockReq({ content: 'Check out <img>' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateCommentUpdate, req, res, next);
      expect(req.body.content).toBe('Check out &lt;img&gt;');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with an error for missing content', async () => {
      const req = createMockReq({ content: ' ' });
      const res = createMockRes();
      const next = createMockNext();

      await runMiddlewareChain(validateCommentUpdate, req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('ValidationError');
      expect(error.errors[0].msg).toBe('Comment content cannot be empty');
    });
  });
});
