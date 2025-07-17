import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';
import {
  createTestUser,
  generateTestToken,
  getCsrfToken,
  createAuthHeaders,
} from '../helpers/testHelpers.js';

describe('User Routes', () => {
  let csrfToken;

  beforeEach(async () => {
    // Get CSRF token for protected routes
    const response = await request(app).get('/');
    csrfToken = getCsrfToken(response);
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const response = await request(app)
        .post('/api/users/register')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeTruthy();
      expect(user.username).toBe(userData.username);
    });

    it('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const response = await request(app)
        .post('/api/users/register')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not register user with mismatched passwords', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        confirmPassword: 'differentpassword',
      };

      const response = await request(app)
        .post('/api/users/register')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not register user with duplicate email', async () => {
      // Create first user
      await createTestUser({ email: 'test@example.com' });

      const userData = {
        email: 'test@example.com',
        username: 'testuser2',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const response = await request(app)
        .post('/api/users/register')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/users/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'login@example.com',
        username: 'loginuser',
      });
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users/login')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users/login')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/users/login')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/users/profile', () => {
    let testUser;
    let token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'profile@example.com',
        username: 'profileuser',
      });
      token = generateTestToken(testUser.id);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set(createAuthHeaders(token))
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      const response = await request(app).get('/api/users/profile').expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/users/logout', () => {
    let testUser;
    let token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'logout@example.com',
        username: 'logoutuser',
      });
      token = generateTestToken(testUser.id);
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set(createAuthHeaders(token, csrfToken))
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('X-XSRF-TOKEN', csrfToken)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
