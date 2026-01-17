jest.mock('../../src/config/db', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
const db = require('../../src/config/db');
const { calculateTargets } = require('../../src/controllers/userController');

describe('calculateTargets', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calculates kcal and macros for male (maintain)', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ tdee_factor: 1.55, steps_target: 8000 }] });

    const r = await calculateTargets({
      gender: 'male', age_years: 25, height_cm: 180, weight_kg: 80,
      activity_level: 'moderate', goal_type: 'maintain',
    });

    expect(r).toMatchObject({
      dailyKcalTarget: 2800,
      dailyStepsTarget: 8000,
      dailyProteinTargetG: 175,
      dailyCarbsTargetG: 350,
      dailyFatTargetG: 77.8,
    });
  });

  test('throws for invalid profile data', async () => {
    await expect(calculateTargets({
      gender: 'male', age_years: 0, height_cm: 180, weight_kg: 80,
      activity_level: 'moderate', goal_type: 'maintain',
    })).rejects.toThrow('Nieprawidłowe dane profilu');
  });
});
