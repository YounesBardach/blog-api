import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';

const baseUrl = '/api/users';

const sampleUser = {
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123!',
};

let xsrfCookie; // For storing the CSRF cookie
let csrfToken; // For CSRF token from GET request

beforeAll(async () => {
  // Get CSRF token before any state-changing request
  const res = await request(app).get('/');
  const cookies = res.headers['set-cookie'];
  xsrfCookie = cookies?.find((c) => c.startsWith('XSRF-TOKEN='));
  csrfToken = xsrfCookie?.split(';')[0]?.split('=')[1];
});

describe('User Routes', () => {
  // SUCCESS SCENARIOS - These tests run sequentially and depend on each other
  describe('Success Flow', () => {
    let userAuthCookies;

    test('POST /register should create a new user', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toMatchObject({
        name: sampleUser.name,
        email: sampleUser.email,
        username: sampleUser.username,
      });

      const userInDb = await prisma.user.findUnique({ where: { email: sampleUser.email } });
      expect(userInDb).not.toBeNull();
    });

    test('POST /login should return a token and set cookie', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe(sampleUser.username);

      const userAuthCookies = res.headers['set-cookie'];
      expect(userAuthCookies).toBeDefined();
      // expect.arrayContaining(...) takes an array of expected items
      expect(userAuthCookies).toEqual(expect.arrayContaining([expect.stringMatching(/^jwt=/)]));
    });

    test('GET /profile should return user data (authenticated)', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Cookie', userAuthCookies)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe(sampleUser.username);
    });

    test('POST /logout should succeed', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Cookie', userAuthCookies)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Logged out successfully');
    });

    test('GET /profile should fail after logout (cookie cleared)', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Cookie', userAuthCookies)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(401);
    });
  });

  // REGISTRATION FAILURE SCENARIOS
  describe('Registration Failures', () => {
    test('POST /register should fail with missing required fields', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.title).toBe('Validation Error');
      expect(res.body.invalid_params).toHaveLength(4); // name, email, username, password
    });

    test('POST /register should fail with invalid email format', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          email: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'email')).toBe(true);
    });

    test('POST /register should fail with username too short', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          username: 'ab',
          email: 'different@email.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(
        res.body.invalid_params.some(
          (param) => param.name === 'username' && param.reason.includes('3 characters')
        )
      ).toBe(true);
    });

    test('POST /register should fail with username containing invalid characters', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          username: 'test-user!',
          email: 'different2@email.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(
        res.body.invalid_params.some(
          (param) =>
            param.name === 'username' && param.reason.includes('lowercase letters and numbers')
        )
      ).toBe(true);
    });

    test('POST /register should fail with password too short', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          password: '12345',
          email: 'different3@email.com',
          username: 'testuser2',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(
        res.body.invalid_params.some(
          (param) => param.name === 'password' && param.reason.includes('6 characters')
        )
      ).toBe(true);
    });

    test('POST /register should fail with empty name', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          name: '',
          email: 'different4@email.com',
          username: 'testuser3',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'name')).toBe(true);
    });

    test('POST /register should fail with duplicate email', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          username: 'differentuser',
        });

      expect(res.status).toBe(409);
      expect(res.body.type).toBe('/errors/conflict/duplicate-entry');
      expect(res.body.title).toBe('Duplicate Entry');
    });

    test('POST /register should fail with duplicate username', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          email: 'different5@email.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.type).toBe('/errors/conflict/duplicate-entry');
      expect(res.body.title).toBe('Duplicate Entry');
    });

    test('POST /register should fail without CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          ...sampleUser,
          email: 'different6@email.com',
          username: 'testuser4',
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /register should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send({
          ...sampleUser,
          email: 'different7@email.com',
          username: 'testuser5',
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });
  });

  // LOGIN FAILURE SCENARIOS
  describe('Login Failures', () => {
    test('POST /login should fail with missing username', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          password: sampleUser.password,
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'username')).toBe(true);
    });

    test('POST /login should fail with missing password', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'password')).toBe(true);
    });

    test('POST /login should fail with empty credentials', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: '',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params).toHaveLength(2);
    });

    test('POST /login should fail with invalid username', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: 'nonexistentuser',
          password: sampleUser.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-credentials');
      expect(res.body.title).toBe('Invalid Credentials');
    });

    test('POST /login should fail with invalid password', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-credentials');
      expect(res.body.title).toBe('Invalid Credentials');
    });

    test('POST /login should fail without CSRF token', async () => {
      const res = await request(app).post(`${baseUrl}/login`).send({
        username: sampleUser.username,
        password: sampleUser.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /login should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });
  });

  // PROFILE ACCESS FAILURE SCENARIOS
  describe('Profile Access Failures', () => {
    test('GET /profile should fail without authentication cookie', async () => {
      const res = await request(app).get(`${baseUrl}/profile`);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
      expect(res.body.title).toBe('Authentication Token Missing');
    });

    test('GET /profile should fail with invalid JWT token', async () => {
      const res = await request(app).get(`${baseUrl}/profile`).set('Cookie', 'jwt=invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
      expect(res.body.title).toBe('Invalid Token');
    });

    test('GET /profile should fail with malformed JWT token', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Cookie', 'jwt=malformed.token.here');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
      expect(res.body.title).toBe('Invalid Token');
    });
  });

  // LOGOUT FAILURE SCENARIOS
  describe('Logout Failures', () => {
    let logoutTestAuthCookies;

    // First login to get valid auth cookie for logout tests
    beforeAll(async () => {
      const loginRes = await request(app)
        .post(`${baseUrl}/login`)
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });
      logoutTestAuthCookies = loginRes.headers['set-cookie'];
    });

    test('POST /logout should fail without authentication cookie', async () => {
      const res = await request(app).post(`${baseUrl}/logout`).set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
    });

    test('POST /logout should fail without CSRF token', async () => {
      const res = await request(app).post(`${baseUrl}/logout`).set('Cookie', logoutTestAuthCookies);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /logout should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Cookie', logoutTestAuthCookies)
        .set('X-XSRF-TOKEN', 'invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /logout should fail with invalid JWT token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Cookie', 'jwt=invalid-token')
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });
  });
});
