const request = require('supertest');
const app = require('../../src/server');

function uniqueEmail() {
  return `test+${Date.now()}@example.com`;
}

function uniqueUsername() {
  return `testuser_${Date.now()}`;
}

describe('Auth flow: register -> login -> me', () => {
  it('should register, login and access /api/auth/me with JWT', async () => {
    const email = uniqueEmail();
    const username = uniqueUsername();
    const password = 'StrongPass123!';

    // REGISTER
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, username, password })
      .expect(201);

    expect(registerRes.body).toHaveProperty('token');
    expect(registerRes.body).toHaveProperty('user');
    expect(registerRes.body.user.email).toBe(email);
    expect(registerRes.body.user.username).toBe(username);

    // LOGIN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body).toHaveProperty('user');

    const token = loginRes.body.token;

    // /ME without token -> 401
    await request(app)
      .get('/api/auth/me')
      .expect(401);

    // /ME with token -> 200
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body).toHaveProperty('user');
    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.username).toBe(username);
  });
});
