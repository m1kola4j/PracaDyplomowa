const { validateProductMacrosAndCalories } = require('../../src/controllers/productController');

describe('validateProductMacrosAndCalories', () => {
  test('returns null for valid macros and kcal', () => {
    const err = validateProductMacrosAndCalories({
      protein_100: 20, carbs_100: 50, fat_100: 10, kcal_100: 370,
    });
    expect(err).toBeNull();
  });

  test('rejects when macros sum > 100', () => {
    const err = validateProductMacrosAndCalories({
      protein_100: 60, carbs_100: 50, fat_100: 10, kcal_100: 550,
    });
    expect(err).toMatch('Suma białka');
  });

  test('rejects when kcal inconsistent with macros', () => {
    const err = validateProductMacrosAndCalories({
      protein_100: 20, carbs_100: 50, fat_100: 10, kcal_100: 100,
    });
    expect(err).toMatch('niespójna');
  });
});
