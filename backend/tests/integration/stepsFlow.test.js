const request = require('supertest');
const app = require('../../src/server');

function uniqueEmail() { return `test+${Date.now()}@example.com`; }
function uniqueUsername() { return `testuser_${Date.now()}`; }

describe('Steps flow: add/update -> get', () => {
  it('should save steps and read them back (with update)', async () => {
    const email = uniqueEmail();
    const username = uniqueUsername();
    const password = 'StrongPass123!';
    const date = '2026-01-14';

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, username, password })
      .expect(201);

    const token = reg.body.token;

    await request(app)
      .post('/api/steps')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, steps: 5000 })
      .expect(201);

    const firstGet = await request(app)
      .get(`/api/steps/${date}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(firstGet.body.stepsLog.steps).toBe(5000);

    await request(app)
      .post('/api/steps')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, steps: 7000 })
      .expect(200);

    const secondGet = await request(app)
      .get(`/api/steps/${date}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(secondGet.body.stepsLog.steps).toBe(7000);
  });
});
