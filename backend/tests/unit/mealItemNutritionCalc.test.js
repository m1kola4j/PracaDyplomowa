jest.mock('../../src/config/db', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
const db = require('../../src/config/db');
const { addItemToMeal } = require('../../src/controllers/mealItemController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('addItemToMeal nutrition calc', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calculates kcal/macros for quantity_g', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10, name: 'X', category: 'C', kcal_100: 200, protein_100: 10, carbs_100: 30, fat_100: 5 }] })
      .mockResolvedValueOnce({ rows: [{ id: 99, meal_id: 1, product_id: 10, quantity_g: 50, created_at: 'x' }] });

    const req = { user: { id: 123 }, body: { meal_id: 1, product_id: 10, quantity_g: 50 } };
    const res = mockRes();

    await addItemToMeal(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ kcal: 100, protein: 5, carbs: 15, fat: 2.5 }),
    }));
  });
});
