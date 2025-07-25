import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';

const baseUrl = '/api/posts';

const sampleUser = {
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123!',
};

const sampleAdmin = {
  name: 'Admin User',
  email: 'admin@example.com',
  username: 'adminuser',
  password: 'Admin123!',
};

const samplePost = {
  title: 'Test Post Title',
  content: 'This is the content of the test post.',
};

let allCookies;
let csrfToken;
let userAuthCookie;
let adminAuthCookie;

beforeAll(async () => {
  // Clear existing data and create test users directly in database
  await prisma.user.deleteMany();

  // Create regular user with proper password hashing
  const userHashedPassword = await bcrypt.hash(sampleUser.password, 10);
  await prisma.user.create({
    data: {
      name: sampleUser.name,
      email: sampleUser.email,
      username: sampleUser.username,
      passwordHash: userHashedPassword,
      role: 'READER',
    },
  });

  // Create admin user with proper password hashing
  const adminHashedPassword = await bcrypt.hash(sampleAdmin.password, 10);
  await prisma.user.create({
    data: {
      name: sampleAdmin.name,
      email: sampleAdmin.email,
      username: sampleAdmin.username,
      passwordHash: adminHashedPassword,
      role: 'ADMIN',
    },
  });

  // Get CSRF token
  const res = await request(app).get('/').set('Origin', 'http://localhost:5173');
  allCookies = res.headers['set-cookie'];
  const xsrfCookie = allCookies?.find((c) => c.startsWith('XSRF-TOKEN='));
  csrfToken = xsrfCookie?.split(';')[0]?.split('=')[1];

  // Login regular user
  const userLoginRes = await request(app)
    .post('/api/users/login')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', allCookies)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleUser.username,
      password: sampleUser.password,
    });
  userAuthCookie = userLoginRes.headers['set-cookie'];

  // Login admin user
  const adminLoginRes = await request(app)
    .post('/api/users/login')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', allCookies)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleAdmin.username,
      password: sampleAdmin.password,
    });
  adminAuthCookie = adminLoginRes.headers['set-cookie'];
});

afterAll(async () => {
  // Clean up test data - delete posts first due to foreign key constraints
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

describe('Post Routes', () => {
  // SUCCESS SCENARIOS
  describe('Success Scenarios', () => {
    let createdPostId;

    test('GET /posts should return all posts', async () => {
      const res = await request(app).get(baseUrl).set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.posts).toBeInstanceOf(Array);
    });

    test('POST /posts should create a new post (admin)', async () => {
      // Combine cookies for CSRF validation
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.post).toMatchObject({
        title: samplePost.title,
        content: samplePost.content,
      });
      expect(res.body.data.post.author).toBeDefined();

      createdPostId = res.body.data.post.id;
    });

    test('GET /posts/:id should return post by ID', async () => {
      const res = await request(app)
        .get(`${baseUrl}/${createdPostId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.post.id).toBe(createdPostId);
      expect(res.body.data.post.title).toBe(samplePost.title);
    });

    test('PUT /posts/:id should update a post (admin)', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const updatedData = {
        title: 'Updated Post Title',
        content: 'Updated content for the post.',
      };

      const res = await request(app)
        .put(`${baseUrl}/${createdPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(updatedData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.post.title).toBe(updatedData.title);
      expect(res.body.data.post.content).toBe(updatedData.content);
    });

    test('DELETE /posts/:id should delete a post (admin)', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${createdPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Post removed');
    });
  });

  // POST CREATION FAILURE SCENARIOS
  describe('Post Creation Failures', () => {
    test('POST /posts should fail without authentication', async () => {
      const res = await request(app)
        .post(baseUrl)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /posts should fail with invalid JWT token', async () => {
      const combinedCookies = [...allCookies, 'jwt=invalid-token'];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('POST /posts should fail with regular user (not admin)', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
      expect(res.body.title).toBe('Forbidden Access');
    });

    test('POST /posts should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /posts should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /posts should fail with missing title', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({
          content: samplePost.content,
        });

      expect(res.status).toBe(500);
      expect(res.body.type).toBe('/errors/prismaclientvalidation');
    });

    test('POST /posts should fail with missing content', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({
          title: samplePost.title,
        });

      expect(res.status).toBe(500);
      expect(res.body.type).toBe('/errors/prismaclientvalidation');
    });

    test('POST /posts should fail with empty request body', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({});

      expect(res.status).toBe(500);
      expect(res.body.type).toBe('/errors/prismaclientvalidation');
    });
  });

  // POST RETRIEVAL FAILURE SCENARIOS
  describe('Post Retrieval Failures', () => {
    test('GET /posts/:id should fail with non-existent post ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

      const res = await request(app)
        .get(`${baseUrl}/${nonExistentId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
      expect(res.body.title).toBe('Resource Not Found');
    });

    test('GET /posts/:id should fail with invalid post ID format', async () => {
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .get(`${baseUrl}/${invalidId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
    });
  });

  // POST UPDATE FAILURE SCENARIOS
  describe('Post Update Failures', () => {
    let testPostId;

    beforeAll(async () => {
      // Create a test post for update tests
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const createRes = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);
      testPostId = createRes.body.data.post.id;
    });

    test('PUT /posts/:id should fail without authentication', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /posts/:id should fail with regular user (not admin)', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
    });

    test('PUT /posts/:id should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /posts/:id should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /posts/:id should fail with empty request body', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.title).toBe('Validation Error');
    });

    test('PUT /posts/:id should fail with empty title', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(
        res.body.invalid_params.some(
          (param) => param.name === 'title' && param.reason.includes('cannot be empty')
        )
      ).toBe(true);
    });

    test('PUT /posts/:id should fail with empty content', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(
        res.body.invalid_params.some(
          (param) => param.name === 'content' && param.reason.includes('cannot be empty')
        )
      ).toBe(true);
    });

    test('PUT /posts/:id should fail with non-existent post ID', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('PUT /posts/:id should fail with invalid post ID format', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .put(`${baseUrl}/${invalidId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
    });
  });

  // POST DELETE FAILURE SCENARIOS
  describe('Post Delete Failures', () => {
    let testPostId;

    beforeAll(async () => {
      // Create a test post for delete tests
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const createRes = await request(app)
        .post(baseUrl)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(samplePost);
      testPostId = createRes.body.data.post.id;
    });

    test('DELETE /posts/:id should fail without authentication', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testPostId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /posts/:id should fail with regular user (not admin)', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
    });

    test('DELETE /posts/:id should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /posts/:id should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /posts/:id should fail with non-existent post ID', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .delete(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('DELETE /posts/:id should fail with invalid post ID format', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .delete(`${baseUrl}/${invalidId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
    });
  });
});
