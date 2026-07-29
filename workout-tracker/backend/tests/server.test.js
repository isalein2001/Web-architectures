process.env.JWT_SECRET = 'server-test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');

describe('Express application security and routing', () => {
  test('answers native preflight requests only for an allowlisted origin', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'capacitor://localhost')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('capacitor://localhost');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toContain('Origin');
  });

  test('does not reflect an untrusted origin', async () => {
    const response = await request(app)
      .get('/api/does-not-exist')
      .set('Origin', 'https://attacker.example');

    expect(response.status).toBe(404);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('rejects state-changing API requests without the CSRF header', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'Ungültige oder fehlende CSRF-Absicherung.',
    });
  });

  test('keeps unknown API routes as JSON 404 responses', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  test('serves the SPA fallback with security headers and without caching', async () => {
    const response = await request(app).get('/some-client-route');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
