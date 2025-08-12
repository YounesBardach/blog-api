import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';

const baseUrl = '/api/comments';

const sampleUser = {
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123!',
};

const sampleUser2 = {
  name: 'Test User 2',
  email: 'test2@example.com',
  username: 'testuser2',
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

const sampleComment = {
  content: 'This is a test comment.',
};

let allCookies;
let csrfToken;
let userAuthCookie;
let user2AuthCookie;
let adminAuthCookie;
let testPostId;
let adminUserId;

beforeAll(async () => {
  // Clear existing data and create test users and post directly in database
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
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

  // Create second user with proper password hashing
  const user2HashedPassword = await bcrypt.hash(sampleUser2.password, 10);
  await prisma.user.create({
    data: {
      name: sampleUser2.name,
      email: sampleUser2.email,
      username: sampleUser2.username,
      passwordHash: user2HashedPassword,
      role: 'READER',
    },
  });

  // Create admin user with proper password hashing
  const adminHashedPassword = await bcrypt.hash(sampleAdmin.password, 10);
  const adminUser = await prisma.user.create({
    data: {
      name: sampleAdmin.name,
      email: sampleAdmin.email,
      username: sampleAdmin.username,
      passwordHash: adminHashedPassword,
      role: 'ADMIN',
    },
  });
  adminUserId = adminUser.id;

  // Create a test post
  const testPost = await prisma.post.create({
    data: {
      title: samplePost.title,
      content: samplePost.content,
      authorId: adminUserId,
    },
  });
  testPostId = testPost.id;

  // Get CSRF token
  const res = await request(app).get('/api/csrf-token').set('Origin', 'http://localhost:5173');
  allCookies = res.headers['set-cookie'] || [];
  const xsrfCookie = allCookies.find((c) => c.startsWith('XSRF-TOKEN='));
  csrfToken = xsrfCookie?.split(';')[0]?.split('=')[1];

  // Login first user
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

  // Login second user
  const user2LoginRes = await request(app)
    .post('/api/users/login')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', allCookies)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleUser2.username,
      password: sampleUser2.password,
    });
  user2AuthCookie = user2LoginRes.headers['set-cookie'];

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
  // Clean up test data - delete in proper order due to foreign key constraints
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

describe('Comment Routes', () => {
  // SUCCESS SCENARIOS
  describe('Success Scenarios', () => {
    let createdCommentId;

    test('GET /comments/post/:postId should return all comments for a post', async () => {
      const res = await request(app)
        .get(`${baseUrl}/post/${testPostId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comments).toBeInstanceOf(Array);
    });

    test('POST /comments/post/:postId should create a new comment', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment).toMatchObject({
        content: sampleComment.content,
      });
      expect(res.body.data.comment.author).toBeDefined();
      expect(res.body.data.comment.author.username).toBe(sampleUser.username);

      createdCommentId = res.body.data.comment.id;
    });

    test('PUT /comments/:id should update a comment (owner)', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const updatedComment = {
        content: 'This is the updated comment content.',
      };

      const res = await request(app)
        .put(`${baseUrl}/${createdCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(updatedComment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment.content).toBe(updatedComment.content);
    });

    test('PUT /comments/:id should update a comment (admin)', async () => {
      const combinedCookies = [...allCookies, ...adminAuthCookie];
      const updatedComment = {
        content: 'This is admin updated comment content.',
      };

      const res = await request(app)
        .put(`${baseUrl}/${createdCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(updatedComment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment.content).toBe(updatedComment.content);
    });

    test('DELETE /comments/:id should delete a comment (owner)', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      // Create a comment to delete
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      const commentToDeleteId = createRes.body.data.comment.id;

      const res = await request(app)
        .delete(`${baseUrl}/${commentToDeleteId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Comment removed');
    });

    test('DELETE /comments/:id should delete a comment (admin)', async () => {
      const combinedUserCookies = [...allCookies, ...userAuthCookie];
      const combinedAdminCookies = [...allCookies, ...adminAuthCookie];

      // Create a comment to delete by regular user
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedUserCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      const commentToDeleteId = createRes.body.data.comment.id;

      const res = await request(app)
        .delete(`${baseUrl}/${commentToDeleteId}`)
        .set('Cookie', combinedAdminCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Comment removed');
    });
  });

  // COMMENT RETRIEVAL FAILURE SCENARIOS
  describe('Comment Retrieval Failures', () => {
    test('GET /comments/post/:postId should fail with non-existent post ID', async () => {
      const nonExistentPostId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`${baseUrl}/post/${nonExistentPostId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
      expect(res.body.title).toBe('Resource Not Found');
    });

    test('GET /comments/post/:postId should fail with invalid post ID format', async () => {
      const invalidPostId = 'invalid-id-format';

      const res = await request(app)
        .get(`${baseUrl}/post/${invalidPostId}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
    });
  });

  // COMMENT CREATION FAILURE SCENARIOS
  describe('Comment Creation Failures', () => {
    test('POST /comments/post/:postId should fail without authentication', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /comments/post/:postId should fail with invalid JWT token', async () => {
      const combinedCookies = [...allCookies, 'jwt=invalid-token'];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('POST /comments/post/:postId should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /comments/post/:postId should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('POST /comments/post/:postId should fail with missing content', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({});

      expect(res.status).toBe(500);
      expect(res.body.type).toBe('/errors/prismaclientvalidation');
    });

    test('POST /comments/post/:postId should fail with empty content', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: '' });

      expect(res.status).toBe(201);
      expect(res.body.data.comment.content).toBe('');
    });

    test('POST /comments/post/:postId should fail with non-existent post ID', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const nonExistentPostId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`${baseUrl}/post/${nonExistentPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('POST /comments/post/:postId should fail with invalid post ID format', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const invalidPostId = 'invalid-id-format';

      const res = await request(app)
        .post(`${baseUrl}/post/${invalidPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);

      expect(res.status).toBe(404);
    });
  });

  // COMMENT UPDATE FAILURE SCENARIOS
  describe('Comment Update Failures', () => {
    let testCommentId;

    beforeAll(async () => {
      // Create a test comment for update tests
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);
      testCommentId = createRes.body.data.comment.id;
    });

    test('PUT /comments/:id should fail without authentication', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /comments/:id should fail with invalid JWT token', async () => {
      const combinedCookies = [...allCookies, 'jwt=invalid-token'];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('PUT /comments/:id should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /comments/:id should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('PUT /comments/:id should fail with missing content', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'content')).toBe(true);
    });

    test('PUT /comments/:id should fail with empty content', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
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

    test('PUT /comments/:id should fail when user is not owner or admin', async () => {
      const combinedCookies = [...allCookies, ...user2AuthCookie];

      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
      expect(res.body.title).toBe('Forbidden Access');
    });

    test('PUT /comments/:id should fail with non-existent comment ID', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('PUT /comments/:id should fail with invalid comment ID format', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .put(`${baseUrl}/${invalidId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(404);
    });
  });

  // COMMENT DELETE FAILURE SCENARIOS
  describe('Comment Delete Failures', () => {
    let testCommentId;

    beforeAll(async () => {
      // Create a test comment for delete tests
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .send(sampleComment);
      testCommentId = createRes.body.data.comment.id;
    });

    test('DELETE /comments/:id should fail without authentication', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /comments/:id should fail with invalid JWT token', async () => {
      const combinedCookies = [...allCookies, 'jwt=invalid-token'];

      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('DELETE /comments/:id should fail without CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /comments/:id should fail with invalid CSRF token', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/security/invalid-csrf-token');
    });

    test('DELETE /comments/:id should fail when user is not owner or admin', async () => {
      const combinedCookies = [...allCookies, ...user2AuthCookie];

      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
      expect(res.body.title).toBe('Forbidden Access');
    });

    test('DELETE /comments/:id should fail with non-existent comment ID', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .delete(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', combinedCookies)
        .set('X-XSRF-TOKEN', csrfToken)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('DELETE /comments/:id should fail with invalid comment ID format', async () => {
      const combinedCookies = [...allCookies, ...userAuthCookie];
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
