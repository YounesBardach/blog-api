import request from 'supertest';
import { app } from '../../src/app.js';

describe('App Basic Tests', () => {
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'success',
        message: 'Welcome to the Blog API',
      });
    });
  });

  describe('API Documentation', () => {
    it('should serve swagger documentation', async () => {
      const response = await request(app).get('/api-docs/').expect(200);

      expect(response.text).toContain('swagger');
    });
  });

  describe('404 Routes', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/non-existent').expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/').expect(200);

      // Check for Helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
