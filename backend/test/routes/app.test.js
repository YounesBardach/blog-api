import request from 'supertest';
import { app } from '../../src/app.js';

describe('App Integration', () => {
  test('GET / should return welcome message', async () => {
    const res = await request(app).get('/').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      status: 'success',
      message: 'Welcome to the Blog API',
    });
  });

  test('GET /api-docs should serve Swagger UI', async () => {
    const res = await request(app).get('/api-docs').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(301); // Swagger UI uses a redirect to /api-docs/
    expect(res.header.location).toMatch(/\/api-docs\/?/);
  });

  test('Unknown route should return 404', async () => {
    const res = await request(app)
      .get('/this-does-not-exist')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 404,
    });
  });

  test('GET /api/csrf-token should set XSRF-TOKEN cookie and return token in JSON', async () => {
    const res = await request(app).get('/api/csrf-token').set('Origin', 'http://localhost:5173');
    const cookies = res.headers['set-cookie'] || [];

    const xsrfTokenCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));

    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeDefined();
    expect(xsrfTokenCookie).toBeDefined();
    expect(xsrfTokenCookie).toContain('XSRF-TOKEN=');
  });

  test('CORS policy should block disallowed origin', async () => {
    const res = await request(app).get('/').set('Origin', 'https://unauthorized-site.com');

    // Supertest does not send preflight requests.
    // The server responds 200 for disallowed origins.
    // The browser blocks access when CORS headers are missing.
    // That's why we test the headers not the response status.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
