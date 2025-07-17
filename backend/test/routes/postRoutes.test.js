import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../setup.js';
import {
  createTestUser,
  createTestPost,
  generateTestToken,
  getCsrfToken,
  createAuthHeaders,
} from '../helpers/testHelpers.js';

describe('Post Routes', () => {
  let csrfToken;
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;

  beforeEach(async () => {
    // Get CSRF token for protected routes
    const response = await request(app).get('/');
    csrfToken = getCsrfToken(response);

    // Create test users
    regularUser = await createTestUser({
      email: 'regular@example.com',
      username: 'regularuser',
      role: 'USER',
    });

    adminUser = await createTestUser({
      email: 'admin@example.com',
      username: 'adminuser',
      role: 'ADMIN',
    });

    regularToken = generateTestToken(regularUser.id);
    adminToken = generateTestToken(adminUser.id);
  });

  describe('GET /api/posts', () => {
    it('should get all published posts', async () => {
      // Create test posts
      await createTestPost(adminUser.id, { title: 'Published Post 1', published: true });
      await createTestPost(adminUser.id, { title: 'Published Post 2', published: true });
      await createTestPost(adminUser.id, { title: 'Draft Post', published: false });

      const response = await request(app).get('/api/posts').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.posts).toHaveLength(2);
      expect(response.body.posts[0].title).toBe('Published Post 1');
      expect(response.body.posts[1].title).toBe('Published Post 2');
    });

    it('should return empty array when no published posts exist', async () => {
      const response = await request(app).get('/api/posts').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.posts).toHaveLength(0);
    });

    it('should support pagination', async () => {
      // Create multiple posts
      for (let i = 1; i <= 15; i++) {
        await createTestPost(adminUser.id, {
          title: `Post ${i}`,
          published: true,
        });
      }

      const response = await request(app).get('/api/posts?page=1&limit=10').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.posts).toHaveLength(10);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(adminUser.id, {
        title: 'Test Post',
        published: true,
      });
    });

    it('should get a published post by id', async () => {
      const response = await request(app).get(`/api/posts/${testPost.id}`).expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.post.title).toBe('Test Post');
      expect(response.body.post.id).toBe(testPost.id);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app).get('/api/posts/999999').expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for unpublished post (public access)', async () => {
      const draftPost = await createTestPost(adminUser.id, {
        title: 'Draft Post',
        published: false,
      });

      const response = await request(app).get(`/api/posts/${draftPost.id}`).expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/posts', () => {
    it('should create post as admin', async () => {
      const postData = {
        title: 'New Blog Post',
        content: 'This is the content of the new blog post',
        excerpt: 'This is an excerpt',
        published: true,
      };

      const response = await request(app)
        .post('/api/posts')
        .set(createAuthHeaders(adminToken, csrfToken))
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.post.title).toBe(postData.title);
      expect(response.body.post.content).toBe(postData.content);
      expect(response.body.post.authorId).toBe(adminUser.id);

      // Verify post was created in database
      const post = await prisma.post.findUnique({
        where: { id: response.body.post.id },
      });
      expect(post).toBeTruthy();
      expect(post.title).toBe(postData.title);
    });

    it('should not create post as regular user', async () => {
      const postData = {
        title: 'New Blog Post',
        content: 'This is the content',
        excerpt: 'This is an excerpt',
        published: true,
      };

      const response = await request(app)
        .post('/api/posts')
        .set(createAuthHeaders(regularToken, csrfToken))
        .send(postData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not create post without authentication', async () => {
      const postData = {
        title: 'New Blog Post',
        content: 'This is the content',
        excerpt: 'This is an excerpt',
        published: true,
      };

      const response = await request(app)
        .post('/api/posts')
        .set('X-XSRF-TOKEN', csrfToken)
        .send(postData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not create post with invalid data', async () => {
      const postData = {
        // Missing required fields
        content: 'This is the content',
      };

      const response = await request(app)
        .post('/api/posts')
        .set(createAuthHeaders(adminToken, csrfToken))
        .send(postData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(adminUser.id, {
        title: 'Original Title',
        content: 'Original content',
        published: true,
      });
    });

    it('should update post as admin', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        excerpt: 'Updated excerpt',
        published: false,
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set(createAuthHeaders(adminToken, csrfToken))
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.post.title).toBe(updateData.title);
      expect(response.body.post.content).toBe(updateData.content);
      expect(response.body.post.published).toBe(false);

      // Verify post was updated in database
      const updatedPost = await prisma.post.findUnique({
        where: { id: testPost.id },
      });
      expect(updatedPost.title).toBe(updateData.title);
    });

    it('should not update post as regular user', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set(createAuthHeaders(regularToken, csrfToken))
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent post', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/posts/999999')
        .set(createAuthHeaders(adminToken, csrfToken))
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await createTestPost(adminUser.id, {
        title: 'Post to Delete',
        published: true,
      });
    });

    it('should delete post as admin', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set(createAuthHeaders(adminToken, csrfToken))
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify post was deleted from database
      const deletedPost = await prisma.post.findUnique({
        where: { id: testPost.id },
      });
      expect(deletedPost).toBeNull();
    });

    it('should not delete post as regular user', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set(createAuthHeaders(regularToken, csrfToken))
        .expect(403);

      expect(response.body).toHaveProperty('success', false);

      // Verify post still exists
      const post = await prisma.post.findUnique({
        where: { id: testPost.id },
      });
      expect(post).toBeTruthy();
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .delete('/api/posts/999999')
        .set(createAuthHeaders(adminToken, csrfToken))
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
