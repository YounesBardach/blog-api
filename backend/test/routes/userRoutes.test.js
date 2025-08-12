import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';

const baseUrl = '/api/users';

const sampleUser = {
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123!',
};

let allCookies; // For storing all cookies (including CSRF secret)
let csrfToken; // For CSRF token from GET request

beforeAll(async () => {
  // Clear any existing users and create our test user
  await prisma.user.deleteMany();

  // Create the test user with properly hashed password
  const hashedPassword = await bcrypt.hash(sampleUser.password, 10);
  await prisma.user.create({
    data: {
      name: sampleUser.name,
      email: sampleUser.email,
      username: sampleUser.username,
      passwordHash: hashedPassword,
    },
  });

  // Get CSRF token before any state-changing request from the dedicated endpoint
  const res = await request(app).get('/api/csrf-token').set('Origin', 'http://localhost:5173');
  allCookies = res.headers['set-cookie'] || []; // Store all cookies, including the CSRF secret
  const xsrfCookie = allCookies.find((c) => c.startsWith('XSRF-TOKEN='));
  csrfToken = xsrfCookie?.split(';')[0]?.split('=')[1];
});

afterAll(async () => {
  // Clean up test data
  await prisma.user.deleteMany();
});

describe('User Routes', () => {
  // SUCCESS SCENARIOS
  describe('Success Flow', () => {
    let userAuthCookies;

    test('POST /register should create a new user', async () => {
      const newUser = {
        name: 'New Test User',
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'NewPass123!',
      };

      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toMatchObject({
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
      });

      // Verify user was created in database
      const userInDb = await prisma.user.findUnique({ where: { email: newUser.email } });
      expect(userInDb).not.toBeNull();
      expect(userInDb.name).toBe(newUser.name);
      expect(userInDb.username).toBe(newUser.username);

      // Clean up - delete the test user we just created
      await prisma.user.delete({ where: { email: newUser.email } });
    });

    test('POST /login should return a token and set cookie', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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

      userAuthCookies = res.headers['set-cookie'];
      // Login response only contains JWT cookie, CSRF token remains the same
      // We continue using the original CSRF token throughout the session

      expect(userAuthCookies).toBeDefined();
      expect(userAuthCookies).toEqual(expect.arrayContaining([expect.stringMatching(/^jwt=/)]));
    });

    test('GET /profile should return user data (authenticated)', async () => {
      // Need to combine the original cookies (with CSRF secret) and the JWT cookie
      const combinedCookies = [...allCookies, ...userAuthCookies];

      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe(sampleUser.username);
    });

    test('GET /session returns authenticated true with user when logged in', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookies];

      const res = await request(app)
        .get(`${baseUrl}/session`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', combinedCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.data.user.username).toBe(sampleUser.username);
    });

    test('POST /logout should succeed', async () => {
      // Need to combine the original cookies (with CSRF secret) and the JWT cookie
      const combinedCookies = [...allCookies, ...userAuthCookies];

      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Logged out successfully');
    });

    test('GET /profile should fail after logout (cookie cleared)', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(401);
    });
  });

  // REGISTRATION FAILURE SCENARIOS
  describe('Registration Failures', () => {
    test('POST /register should fail with missing required fields', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.title).toBe('Validation Error');
      expect(res.body.invalid_params).toHaveLength(5); // name, email, username, password, confirm_password
    });

    test('POST /register should fail with invalid email format', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          ...sampleUser,
          username: 'test-user!',
          email: 'different2@email.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.type).toBe('/errors/conflict/duplicate-entry');
      expect(res.body.title).toBe('Duplicate Entry');
    });

    test('POST /register should fail with password too short', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .send({
          ...sampleUser,
          email: 'different6@email.com',
          username: 'testuser4',
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /register should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send({
          ...sampleUser,
          email: 'different7@email.com',
          username: 'testuser5',
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });
  });

  // LOGIN FAILURE SCENARIOS
  describe('Login Failures', () => {
    test('POST /login should fail with missing username', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
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
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: 'nonexistentuser',
          password: sampleUser.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication');
      expect(res.body.title).toBe('AuthenticationError');
    });

    test('POST /login should fail with invalid password', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication');
      expect(res.body.title).toBe('AuthenticationError');
    });

    test('POST /login should fail without CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /login should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });
  });

  // PROFILE ACCESS FAILURE SCENARIOS
  describe('Profile Access Failures', () => {
    test('GET /profile should fail without authentication cookie', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
      expect(res.body.title).toBe('Authentication Token Missing');
    });

    test('GET /profile should fail with invalid JWT token', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'jwt=invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
      expect(res.body.title).toBe('Invalid Token');
    });

    test('GET /profile should fail with malformed JWT token', async () => {
      const res = await request(app)
        .get(`${baseUrl}/profile`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'jwt=malformed.token.here');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
      expect(res.body.title).toBe('Invalid Token');
    });
  });

  describe('Session endpoint', () => {
    test('GET /session returns authenticated false when not logged in', async () => {
      const res = await request(app)
        .get(`${baseUrl}/session`)
        .set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(false);
    });
  });

  // LOGOUT FAILURE SCENARIOS
  describe('Logout Failures', () => {
    let logoutTestAuthCookies;
    let logoutCsrfToken;

    // First login to get valid auth cookie for logout tests
    beforeAll(async () => {
      const loginRes = await request(app)
        .post(`${baseUrl}/login`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', allCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        });
      logoutTestAuthCookies = loginRes.headers['set-cookie'];
      // Extract CSRF token from login response
      const logoutXsrfCookie = logoutTestAuthCookies?.find((c) => c.startsWith('XSRF-TOKEN='));
      logoutCsrfToken = logoutXsrfCookie?.split(';')[0]?.split('=')[1];
    });

    test('POST /logout should fail without authentication cookie', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Origin', 'http://localhost:5173')
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /logout should fail without CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', logoutTestAuthCookies);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /logout should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', logoutTestAuthCookies)
        .set('X-XSRF-TOKEN', 'invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /logout should fail with invalid JWT token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'jwt=invalid-token')
        .set('X-XSRF-TOKEN', logoutCsrfToken || csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });
  });
});
