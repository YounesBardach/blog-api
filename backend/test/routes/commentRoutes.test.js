import request from 'supertest';
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

let xsrfCookie;
let csrfToken;
let userAuthCookie;
let user2AuthCookie;
let adminAuthCookie;
let testPostId;
let createdCommentId;

beforeAll(async () => {
  // Get CSRF token
  const res = await request(app).get('/');
  const cookies = res.headers['set-cookie'];
  xsrfCookie = cookies?.find((c) => c.startsWith('XSRF-TOKEN='));
  csrfToken = xsrfCookie?.split(';')[0]?.split('=')[1];

  // Register and login first user
  await request(app)
    .post('/api/users/register')
    .set('Cookie', xsrfCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send(sampleUser);

  const userLoginRes = await request(app)
    .post('/api/users/login')
    .set('Cookie', xsrfCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleUser.username,
      password: sampleUser.password,
    });
  userAuthCookie = userLoginRes.headers['set-cookie'];

  // Register and login second user
  await request(app)
    .post('/api/users/register')
    .set('Cookie', xsrfCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send(sampleUser2);

  const user2LoginRes = await request(app)
    .post('/api/users/login')
    .set('Cookie', xsrfCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleUser2.username,
      password: sampleUser2.password,
    });
  user2AuthCookie = user2LoginRes.headers['set-cookie'];

  // Create admin user directly in database and login
  await prisma.user.create({
    data: {
      name: sampleAdmin.name,
      email: sampleAdmin.email,
      username: sampleAdmin.username,
      passwordHash: '$2a$10$hashedpassword', // Mock hash
      role: 'ADMIN',
    },
  });

  const adminLoginRes = await request(app)
    .post('/api/users/login')
    .set('Cookie', xsrfCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send({
      username: sampleAdmin.username,
      password: sampleAdmin.password,
    });
  adminAuthCookie = adminLoginRes.headers['set-cookie'];

  // Create a test post
  const postRes = await request(app)
    .post('/api/posts')
    .set('Cookie', adminAuthCookie)
    .set('X-XSRF-TOKEN', csrfToken)
    .send(samplePost);
  testPostId = postRes.body.data.post.id;
});

describe('Comment Routes', () => {
  // SUCCESS SCENARIOS
  describe('Success Scenarios', () => {
    test('GET /comments/post/:postId should return all comments for a post', async () => {
      const res = await request(app).get(`${baseUrl}/post/${testPostId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comments).toBeInstanceOf(Array);
    });

    test('POST /comments/post/:postId should create a new comment', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
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
      const updatedComment = {
        content: 'This is the updated comment content.',
      };

      const res = await request(app)
        .put(`${baseUrl}/${createdCommentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(updatedComment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment.content).toBe(updatedComment.content);
    });

    test('PUT /comments/:id should update a comment (admin)', async () => {
      const updatedComment = {
        content: 'This is admin updated comment content.',
      };

      const res = await request(app)
        .put(`${baseUrl}/${createdCommentId}`)
        .set('Cookie', adminAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(updatedComment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment.content).toBe(updatedComment.content);
    });

    test('DELETE /comments/:id should delete a comment (owner)', async () => {
      // Create a comment to delete
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      const commentToDeleteId = createRes.body.data.comment.id;

      const res = await request(app)
        .delete(`${baseUrl}/${commentToDeleteId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Comment removed');
    });

    test('DELETE /comments/:id should delete a comment (admin)', async () => {
      // Create a comment to delete by regular user
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      const commentToDeleteId = createRes.body.data.comment.id;

      const res = await request(app)
        .delete(`${baseUrl}/${commentToDeleteId}`)
        .set('Cookie', adminAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken);

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

      const res = await request(app).get(`${baseUrl}/post/${nonExistentPostId}`);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
      expect(res.body.title).toBe('Resource Not Found');
    });

    test('GET /comments/post/:postId should fail with invalid post ID format', async () => {
      const invalidPostId = 'invalid-id-format';

      const res = await request(app).get(`${baseUrl}/post/${invalidPostId}`);

      expect(res.status).toBe(400);
    });
  });

  // COMMENT CREATION FAILURE SCENARIOS
  describe('Comment Creation Failures', () => {
    test('POST /comments/post/:postId should fail without authentication', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
    });

    test('POST /comments/post/:postId should fail with invalid JWT token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', 'jwt=invalid-token')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('POST /comments/post/:postId should fail without CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .send(sampleComment);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /comments/post/:postId should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send(sampleComment);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('POST /comments/post/:postId should fail with missing content', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation/invalid-data');
    });

    test('POST /comments/post/:postId should fail with empty content', async () => {
      const res = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation/invalid-data');
    });

    test('POST /comments/post/:postId should fail with non-existent post ID', async () => {
      const nonExistentPostId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`${baseUrl}/post/${nonExistentPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('POST /comments/post/:postId should fail with invalid post ID format', async () => {
      const invalidPostId = 'invalid-id-format';

      const res = await request(app)
        .post(`${baseUrl}/post/${invalidPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);

      expect(res.status).toBe(400);
    });
  });

  // COMMENT UPDATE FAILURE SCENARIOS
  describe('Comment Update Failures', () => {
    let testCommentId;

    beforeAll(async () => {
      // Create a test comment for update tests
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);
      testCommentId = createRes.body.data.comment.id;
    });

    test('PUT /comments/:id should fail without authentication', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
    });

    test('PUT /comments/:id should fail with invalid JWT token', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', 'jwt=invalid-token')
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('PUT /comments/:id should fail without CSRF token', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('PUT /comments/:id should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', 'invalid-token')
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('PUT /comments/:id should fail with missing content', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.type).toBe('/errors/validation-error');
      expect(res.body.invalid_params.some((param) => param.name === 'content')).toBe(true);
    });

    test('PUT /comments/:id should fail with empty content', async () => {
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
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
      const res = await request(app)
        .put(`${baseUrl}/${testCommentId}`)
        .set('Cookie', user2AuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
      expect(res.body.title).toBe('Forbidden Access');
    });

    test('PUT /comments/:id should fail with non-existent comment ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('PUT /comments/:id should fail with invalid comment ID format', async () => {
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .put(`${baseUrl}/${invalidId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(400);
    });
  });

  // COMMENT DELETE FAILURE SCENARIOS
  describe('Comment Delete Failures', () => {
    let testCommentId;

    beforeAll(async () => {
      // Create a test comment for delete tests
      const createRes = await request(app)
        .post(`${baseUrl}/post/${testPostId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken)
        .send(sampleComment);
      testCommentId = createRes.body.data.comment.id;
    });

    test('DELETE /comments/:id should fail without authentication', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/missing-token');
    });

    test('DELETE /comments/:id should fail with invalid JWT token', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', 'jwt=invalid-token')
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(401);
      expect(res.body.type).toBe('/errors/authentication/invalid-token');
    });

    test('DELETE /comments/:id should fail without CSRF token', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('DELETE /comments/:id should fail with invalid CSRF token', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', 'invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/csrf-error');
    });

    test('DELETE /comments/:id should fail when user is not owner or admin', async () => {
      const res = await request(app)
        .delete(`${baseUrl}/${testCommentId}`)
        .set('Cookie', user2AuthCookie)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.type).toBe('/errors/authorization/forbidden-access');
      expect(res.body.title).toBe('Forbidden Access');
    });

    test('DELETE /comments/:id should fail with non-existent comment ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .delete(`${baseUrl}/${nonExistentId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(404);
      expect(res.body.type).toBe('/errors/resource-not-found');
    });

    test('DELETE /comments/:id should fail with invalid comment ID format', async () => {
      const invalidId = 'invalid-id-format';

      const res = await request(app)
        .delete(`${baseUrl}/${invalidId}`)
        .set('Cookie', userAuthCookie)
        .set('X-XSRF-TOKEN', csrfToken);

      expect(res.status).toBe(400);
    });
  });
});
