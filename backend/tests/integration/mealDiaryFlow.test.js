const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/db');

const u = () => Date.now();
afterAll(async () => db.pool.end());

describe('Meal diary flow', () => {
  it('creates product+meal, adds item, checks macros', async () => {
    const date = '2026-01-14', qty = 50;

    const token = (await request(app).post('/api/auth/register').send({
      email: `test+${u()}@example.com`,
      username: `testuser_${u()}`,
      password: 'StrongPass123!',
    }).expect(201)).body.token;

    const prod = (await request(app).post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `TestProduct_${u()}`, category: 'Test', kcal_100: 200, protein_100: 10, carbs_100: 30, fat_100: 5 })
      .expect(201)).body.product;

    const mealId = (await request(app).post('/api/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, meal_type: 'lunch' })
      .expect(r => { if (![200, 201].includes(r.status)) throw new Error(); })
    ).body.meal.id;

    await request(app).post('/api/meals/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ meal_id: mealId, product_id: prod.id, quantity_g: qty })
      .expect(201);

    const lunch = (await request(app).get(`/api/meals/date/${date}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)).body.meals.find(m => m.meal_type === 'lunch');

    const it = lunch.items[0];
    expect(Number(it.kcal)).toBeCloseTo(Number(prod.kcal_100) * qty / 100, 1);
    expect(Number(it.protein)).toBeCloseTo(Number(prod.protein_100) * qty / 100, 1);
    expect(Number(it.carbs)).toBeCloseTo(Number(prod.carbs_100) * qty / 100, 1);
    expect(Number(it.fat)).toBeCloseTo(Number(prod.fat_100) * qty / 100, 1);
  });
});
